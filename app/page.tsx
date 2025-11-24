import Link from "next/link";
import { CalendarWidget } from "@/components/CalendarWidget";
import { TodoColumn } from "@/components/TodoColumn";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const getMembers = () =>
  prisma.familyMember.findMany({
    orderBy: { name: "asc" },
  });

export default async function Home() {
  const members = await getMembers();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-0">
        <CalendarWidget calendarIframeSrc={env.NEXT_PUBLIC_CALENDAR_IFRAME_URL} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Per-member todos</h2>
            <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
              Manage markdown →
            </Link>
          </div>
          {members.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              No family members are registered yet. Add markdown files under <code>content/todos</code>{" "}
              or use the{" "}
              <Link href="/admin" className="font-semibold text-slate-900 underline">
                admin sync screen
              </Link>{" "}
              to seed the database.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {members.map((member) => (
                <TodoColumn
                  key={member.id}
                  member={{
                    slug: member.slug,
                    name: member.name,
                    colorHex: member.colorHex,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
