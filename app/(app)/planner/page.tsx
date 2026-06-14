import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PlannerPage() {
  const user = await requireUser();
  const plans = await db.studyPlan.findMany({
    where: { userId: user.id },
    orderBy: { examDate: "asc" },
    include: { items: { orderBy: { startAt: "asc" } } }
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_26rem]">
      <section className="grid gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Smart Study Planner
          </p>
          <h2 className="mt-1 text-3xl font-black">AI-generated schedules</h2>
        </div>
        {plans.length ? (
          plans.map((plan) => (
            <article key={plan.id} className="panel p-4">
              <h3 className="font-bold">{plan.title}</h3>
              <p className="text-sm text-slate-400">
                Exam: {plan.examDate.toLocaleDateString()} | {plan.items.length} sessions
              </p>
            </article>
          ))
        ) : (
          <div className="panel p-6 text-slate-400">No study plans yet.</div>
        )}
      </section>
      <ApiForm
        endpoint="/api/planner"
        submitLabel="Create plan"
        fields={[
          { name: "title", label: "Plan title", required: true },
          { name: "examDate", label: "Exam date", type: "datetime-local", required: true },
          {
            name: "subjects",
            label: "Subjects JSON",
            type: "json",
            required: true,
            help: "Use an array of subject, confidence 1-5, and weeklyHours objects."
          }
        ]}
      />
    </div>
  );
}
