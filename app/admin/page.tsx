import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { ActionButton } from "@/components/ActionButton";
import {
  saveMarkdownAction,
  triggerSyncAction,
  uploadMarkdownAction,
} from "@/app/admin/actions";

const TODOS_DIR = path.join(process.cwd(), "content", "todos");

type MarkdownSource = {
  fileName: string;
  content: string;
  frontmatter: Record<string, unknown>;
};

const loadSources = async (): Promise<MarkdownSource[]> => {
  try {
    const entries = await fs.readdir(TODOS_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
    const sources = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(TODOS_DIR, file.name);
        const content = await fs.readFile(fullPath, "utf-8");
        const frontmatter = matter(content).data;
        return {
          fileName: file.name,
          content,
          frontmatter,
        };
      }),
    );
    return sources;
  } catch (error) {
    console.error("Failed to load markdown sources", error);
    return [];
  }
};

const formatLabel = (source: MarkdownSource) => {
  const name = source.frontmatter?.name;
  const member = source.frontmatter?.member;
  return name && member ? `${name} (${member})` : source.fileName;
};

export default async function AdminPage() {
  const sources = await loadSources();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Admin
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Markdown Todo Control Room</h1>
        <p className="text-sm text-slate-600">
          Edit the markdown sources per family member, upload new files, or force a re-sync between the
          files and SQLite cache.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action={triggerSyncAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Resync from disk</h2>
            <p className="text-sm text-slate-500">
              Re-parse markdown files and push the latest snapshot into SQLite.
            </p>
          </div>
          <ActionButton pendingLabel="Syncing…">Run Sync</ActionButton>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action={uploadMarkdownAction} className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upload markdown</h2>
            <p className="text-sm text-slate-500">
              Drop a prepared <code>.md</code> file to add or replace a member&apos;s todo list.
            </p>
          </div>
          <input
            type="file"
            name="file"
            accept=".md"
            className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm"
            required
          />
          <ActionButton pendingLabel="Uploading…">Upload &amp; Sync</ActionButton>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Markdown files</h2>
          <p className="text-sm text-slate-500">
            {sources.length ? `Editing ${sources.length} file(s).` : "No markdown files found."}
          </p>
        </div>

        <div className="space-y-6">
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Drop files into <code>content/todos</code> to get started.
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.fileName}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-1 pb-3">
                  <h3 className="text-base font-semibold text-slate-900">{formatLabel(source)}</h3>
                  <p className="text-xs text-slate-500">{source.fileName}</p>
                </div>
                <form action={saveMarkdownAction.bind(null, source.fileName)} className="space-y-3">
                  <textarea
                    name="content"
                    defaultValue={source.content}
                    className="h-64 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Changes save the file then re-sync.</span>
                    <ActionButton pendingLabel="Saving…" variant="secondary">
                      Save Markdown
                    </ActionButton>
                  </div>
                </form>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

