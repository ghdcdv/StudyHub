import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function QuizzesPage() {
  const user = await requireUser();
  const quizzes = await db.quiz.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { questions: true, attempts: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="grid gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Quizzes</p>
          <h2 className="mt-1 text-3xl font-black">Generated quizzes and attempts</h2>
        </div>
        {quizzes.length ? (
          quizzes.map((quiz) => (
            <article key={quiz.id} className="panel p-4">
              <h3 className="font-bold">{quiz.title}</h3>
              <p className="text-sm text-slate-400">
                {quiz.questions.length} questions
                {quiz.attempts[0] ? ` | Last score ${quiz.attempts[0].score}/${quiz.attempts[0].total}` : ""}
              </p>
            </article>
          ))
        ) : (
          <div className="panel p-6 text-slate-400">No quizzes yet.</div>
        )}
      </section>
      <ApiForm
        endpoint="/api/quizzes"
        submitLabel="Generate quiz"
        fields={[
          { name: "title", label: "Quiz title", required: true },
          { name: "subject", label: "Subject" },
          { name: "difficulty", label: "Difficulty" },
          { name: "sourceText", label: "Source material", type: "textarea", required: true },
          { name: "count", label: "Questions", type: "number", required: true }
        ]}
      />
    </div>
  );
}
