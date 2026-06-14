import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminPage() {
  await requireAdmin();
  const [users, activeSubscriptions, uploads, aiUsage] = await Promise.all([
    db.user.count(),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.upload.count(),
    db.aiUsage.groupBy({
      by: ["feature"],
      _sum: { input: true, output: true },
      _count: true
    })
  ]);

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Admin</p>
        <h2 className="mt-1 text-3xl font-black">Operational dashboard</h2>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Users" value={users} />
        <Stat label="Active subscriptions" value={activeSubscriptions} />
        <Stat label="Uploads" value={uploads} />
      </section>
      <section className="panel p-4">
        <h3 className="mb-3 font-bold">AI usage</h3>
        <pre className="overflow-auto rounded-lg bg-black/35 p-3 text-xs">
          {JSON.stringify(aiUsage, null, 2)}
        </pre>
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
