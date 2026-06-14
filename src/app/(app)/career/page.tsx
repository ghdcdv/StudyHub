import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CareerPage() {
  const user = await requireUser();
  const profiles = await db.careerProfile.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="grid gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Career Coach
          </p>
          <h2 className="mt-1 text-3xl font-black">AI career roadmaps</h2>
        </div>
        {profiles.length ? (
          profiles.map((profile) => (
            <article key={profile.id} className="panel p-4">
              <p className="text-sm text-slate-400">{profile.createdAt.toLocaleString()}</p>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-black/35 p-3 text-xs">
                {JSON.stringify(profile.result, null, 2)}
              </pre>
            </article>
          ))
        ) : (
          <div className="panel p-6 text-slate-400">No career profiles yet.</div>
        )}
      </section>
      <ApiForm
        endpoint="/api/career"
        submitLabel="Generate roadmap"
        fields={[
          { name: "interests", label: "Interests JSON array", type: "json", required: true },
          { name: "subjects", label: "Subjects JSON array", type: "json", required: true },
          { name: "skills", label: "Skills JSON array", type: "json", required: true }
        ]}
      />
    </div>
  );
}
