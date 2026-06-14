import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function VaultPage() {
  const user = await requireUser();
  const chunks = await db.noteChunk.count({ where: { userId: user.id } });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_26rem]">
      <section className="panel p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          AI Knowledge Vault
        </p>
        <h2 className="mt-1 text-3xl font-black">Ask questions from your saved notes</h2>
        <p className="mt-4 text-slate-300">
          The vault searches {chunks} embedded note chunks and answers using only
          your stored content.
        </p>
      </section>
      <ApiForm
        endpoint="/api/vault/query"
        submitLabel="Ask vault"
        fields={[
          { name: "question", label: "Question", type: "textarea", required: true }
        ]}
      />
    </div>
  );
}
