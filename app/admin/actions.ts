"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { syncMarkdownTodos } from "@/lib/markdownTodos";

const TODOS_DIR = path.join(process.cwd(), "content", "todos");

export const saveMarkdownAction = async (fileName: string, formData: FormData) => {
  const content = formData.get("content");
  if (typeof content !== "string") {
    throw new Error("Invalid content payload");
  }

  const targetPath = path.join(TODOS_DIR, fileName);
  await fs.writeFile(targetPath, content, "utf-8");
  await syncMarkdownTodos();
  revalidatePath("/admin");
};

export const uploadMarkdownAction = async (formData: FormData) => {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("No file uploaded");
  }

  if (!file.name.endsWith(".md")) {
    throw new Error("Only .md files are allowed.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const targetPath = path.join(TODOS_DIR, file.name);
  await fs.writeFile(targetPath, buffer);
  await syncMarkdownTodos();
  revalidatePath("/admin");
};

export const triggerSyncAction = async () => {
  await syncMarkdownTodos();
  revalidatePath("/admin");
};

