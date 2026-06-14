import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requireUser();
  const [
    assignments,
    flashcards,
    quizzes,
    notes,
    groups,
    badges,
    nextAssignments
  ] = await Promise.all([
    db.assignment.count({ where: { userId: user.id, status: "OPEN" } }),
    db.flashcard.count({ where: { userId: user.id } }),
    db.quiz.count({ where: { userId: user.id } }),
    db.note.count({ where: { userId: user.id } }),
    db.groupMembership.count({ where: { userId: user.id } }),
    db.userBadge.count({ where: { userId: user.id } }),
    db.assignment.findMany({
      where: { userId: user.id, status: "OPEN" },
      orderBy: { dueAt: "asc" },
      take: 5
    })
  ]);

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Home</p>
        <h2 className="mt-1 text-3xl font-black">Your live study workspace</h2>
      </section>
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Open assignments" value={assignments} />
        <Stat label="Flashcards" value={flashcards} />
        <Stat label="Quizzes" value={quizzes} />
        <Stat label="Notes" value={notes} />
        <Stat label="Groups" value={groups} />
        <Stat label="Badges" value={badges} />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Next assignments</h3>
            <Link className="secondary-button" href="/assignments">
              Manage
            </Link>
          </div>
          {nextAssignments.length ? (
            <div className="grid gap-3">
              {nextAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-lg border border-app-line bg-white/5 p-3"
                >
                  <div>
                    <strong>{assignment.title}</strong>
                    <p className="text-sm text-slate-400">{assignment.subject}</p>
                  </div>
                  <time className="text-sm text-slate-300">
                    {assignment.dueAt.toLocaleDateString()}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <Empty href="/assignments" label="Add your first assignment" />
          )}
        </div>
        <div className="panel grid content-start gap-3 p-4">
          <h3 className="font-bold">Start studying</h3>
          <Link className="primary-button text-center" href="/ai-tutor">
            Ask AI Tutor
          </Link>
          <Link className="secondary-button text-center" href="/homework">
            Scan homework
          </Link>
          <Link className="secondary-button text-center" href="/notes">
            Add notes
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <strong className="mt-2 block text-3xl">{value}</strong>
    </div>
  );
}

function Empty({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-app-line p-6 text-center text-slate-400">
      <Link className="secondary-button" href={href}>
        {label}
      </Link>
    </div>
  );
}
