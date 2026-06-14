import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="panel p-5">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Profile</p>
        <h2 className="mt-1 text-3xl font-black">Student learning profile</h2>
        <dl className="mt-6 grid gap-3 text-sm text-slate-300">
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Grade</dt>
            <dd>{user.gradeLevel ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">School</dt>
            <dd>{user.school ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Country</dt>
            <dd>{user.country ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Subjects</dt>
            <dd>{user.subjects.length ? user.subjects.join(", ") : "Not set"}</dd>
          </div>
        </dl>
      </section>
      <ApiForm
        endpoint="/api/profile"
        method="PATCH"
        submitLabel="Update profile"
        fields={[
          { name: "name", label: "Display name" },
          { name: "gradeLevel", label: "Grade level" },
          { name: "school", label: "School" },
          { name: "country", label: "Country" },
          { name: "subjects", label: "Subjects JSON array", type: "json" }
        ]}
      />
    </div>
  );
}
