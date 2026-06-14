import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function RevisionPage() {
  const user = await requireUser();
  const [attempts, reviews, sessions] = await Promise.all([
    db.quizAttempt.count({ where: { userId: user.id } }),
    db.flashcardReview.count({ where: { userId: user.id } }),
    db.studySession.count({ where: { userId: user.id } })
  ]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="grid gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            AI Revision Planner
          </p>
          <h2 className="mt-1 text-3xl font-black">Generated from real performance</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Quiz attempts" value={attempts} />
          <Stat label="Flashcard reviews" value={reviews} />
          <Stat label="Study sessions" value={sessions} />
        </div>
      </section>
      <ApiForm
        endpoint="/api/revision"
        submitLabel="Analyze revision needs"
        fields={[]}
      />
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
