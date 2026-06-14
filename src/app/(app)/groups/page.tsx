import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await db.studyGroup.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { updatedAt: "desc" },
    include: {
      members: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } }
      }
    }
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="grid gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Study Groups
          </p>
          <h2 className="mt-1 text-3xl font-black">Groups, invites, and chat</h2>
        </div>
        {groups.length ? (
          groups.map((group) => (
            <article key={group.id} className="panel grid gap-3 p-4">
              <div>
                <h3 className="font-bold">{group.name}</h3>
                <p className="text-sm text-slate-400">
                  {group.members.length} members | Invite code {group.inviteCode}
                </p>
              </div>
              <div className="grid gap-2">
                {group.messages.map((message) => (
                  <div key={message.id} className="rounded-lg bg-white/5 p-3">
                    <strong>{message.user.name}</strong>
                    <p className="text-sm text-slate-300">{message.content}</p>
                  </div>
                ))}
              </div>
              <ApiForm
                endpoint={`/api/groups/${group.id}/messages`}
                submitLabel="Send message"
                fields={[{ name: "content", label: "Message", required: true }]}
              />
            </article>
          ))
        ) : (
          <div className="panel p-6 text-slate-400">No study groups yet.</div>
        )}
      </section>
      <aside className="grid content-start gap-4">
        <ApiForm
          endpoint="/api/groups"
          submitLabel="Create group"
          fields={[
            { name: "name", label: "Group name", required: true },
            { name: "subject", label: "Subject" },
            { name: "description", label: "Description", type: "textarea" }
          ]}
        />
        <ApiForm
          endpoint="/api/groups/join"
          submitLabel="Join group"
          fields={[{ name: "inviteCode", label: "Invite code", required: true }]}
        />
      </aside>
    </div>
  );
}
