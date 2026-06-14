import { ApiForm } from "@/components/api-form";
import { NoteEditor } from "@/components/note-editor";
import { UploadForm } from "@/components/upload-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function NotesPage() {
  const user = await requireUser();
  const notes = await db.note.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" }
  });
  const active = notes[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[18rem_1fr_24rem]">
      <aside className="panel p-4">
        <h2 className="mb-3 font-bold">My notes</h2>
        {notes.length ? (
          <div className="grid gap-2">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-app-line p-3">
                <strong>{note.title}</strong>
                <p className="text-xs text-slate-400">{note.updatedAt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Create or import a note to start the knowledge vault.</p>
        )}
      </aside>
      {active ? (
        <NoteEditor
          noteId={active.id}
          initialTitle={active.title}
          initialContent={active.content}
        />
      ) : (
        <div className="panel grid place-items-center p-8 text-slate-400">
          No active note yet.
        </div>
      )}
      <aside className="grid content-start gap-4">
        <UploadForm
          endpoint="/api/notes/import"
          label="Import PDF, image, or text notes"
          accept="application/pdf,image/jpeg,image/png,image/webp,text/plain"
          extraFields={
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input name="generateStudySet" type="checkbox" value="true" />
              Generate flashcards and quiz
            </label>
          }
        />
        <ApiForm
          endpoint="/api/notes"
          submitLabel="Create note"
          fields={[
            { name: "title", label: "Title", required: true },
            { name: "content", label: "Content", type: "textarea", required: true }
          ]}
        />
      </aside>
    </div>
  );
}
