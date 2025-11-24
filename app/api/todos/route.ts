import { NextResponse } from "next/server";
import { TodoStatus } from "@prisma/client";
import { z } from "zod";
import { createTodo, listTodos } from "@/lib/todoService";

const createSchema = z.object({
  title: z.string().min(1),
  memberSlug: z.string().min(1),
  notes: z.string().optional(),
  category: z.string().optional(),
  timeOfDay: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const statusValues = Object.values(TodoStatus);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const memberSlug = url.searchParams.get("member") ?? undefined;
    const statusParam = url.searchParams.get("status") as TodoStatus | null;
    const includeCleared = url.searchParams.get("includeCleared") === "true";

    const status =
      statusParam && statusValues.includes(statusParam) ? statusParam : undefined;

    const todos = await listTodos({
      memberSlug,
      status,
      includeCleared,
    });

    return NextResponse.json({ todos });
  } catch (error) {
    console.error("Failed to list todos", error);
    return NextResponse.json(
      { error: "Unable to load todos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createSchema.parse(body);
    const todo = await createTodo(payload);
    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Failed to create todo", error);
    return NextResponse.json(
      { error: "Unable to create todo." },
      { status: 500 },
    );
  }
}

