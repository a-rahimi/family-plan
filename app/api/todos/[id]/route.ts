import { NextResponse } from "next/server";
import { Prisma, TodoStatus } from "@prisma/client";
import { z } from "zod";
import { updateTodo } from "@/lib/todoService";

const updateSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  timeOfDay: z.string().optional(),
  status: z.nativeEnum(TodoStatus).optional(),
  tags: z.array(z.string()).optional(),
});

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const payload = updateSchema.parse(body);
    const todo = await updateTodo(params.id, payload);
    return NextResponse.json({ todo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Todo not found." }, { status: 404 });
    }

    console.error(`Failed to update todo ${params.id}`, error);
    return NextResponse.json(
      { error: "Unable to update todo." },
      { status: 500 },
    );
  }
}

