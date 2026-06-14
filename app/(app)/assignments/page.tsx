import { AssignmentActions } from "@/components/assignment-actions";
import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AssignmentsPage() {
  const user = await requireUser();
  const assignments = await db.assignment.findMany({
    where: { userId: user.id },
    orderBy: { dueAt: "asc" }
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="grid gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Assignments
          </p>
          <h2 className="mt-1 text-3xl font-black">CRUD tracker with XP rewards</h2>
        </div>
        {assignments.length ? (
          assignments.map((assignment) => (
            <article key={assignment.id} className="panel grid gap-3 p-4">
              <div>
                <h3 className="font-bold">{assignment.title}</h3>
                <p className="text-sm text-slate-400">
                  {assignment.subject} | Due {assignment.dueAt.toLocaleString()} | {assignment.status}
                </p>
              </div>
              <AssignmentActions
                id={assignment.id}
                completed={assignment.status === "COMPLETED"}
              />
            </article>
          ))
        ) : (
          <div className="panel p-6 text-slate-400">No assignments yet.</div>
        )}
      </section>
      <ApiForm
        endpoint="/api/assignments"
        submitLabel="Add assignment"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "subject", label: "Subject" },
          { name: "details", label: "Details", type: "textarea" },
          { name: "dueAt", label: "Due at", type: "datetime-local", required: true }
        ]}
      />
    </div>
  );
}
