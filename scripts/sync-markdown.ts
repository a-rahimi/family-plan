import { prisma } from "@/lib/prisma";
import { syncMarkdownTodos } from "@/lib/markdownTodos";

async function main() {
  try {
    const result = await syncMarkdownTodos();
    console.log(
      `Synced ${result.todosProcessed} todos from ${result.filesProcessed} markdown file(s).`,
    );
  } catch (error) {
    console.error("Failed to sync markdown todos:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();

