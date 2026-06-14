"use client";

import { useEffect, useRef, useState } from "react";

export function NoteEditor({
  noteId,
  initialTitle,
  initialContent
}: {
  noteId: string;
  initialTitle: string;
  initialContent: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState("Saved");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    setStatus("Saving...");
    const timeout = window.setTimeout(async () => {
      await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          richContent: { format: "markdown" }
        })
      });
      setStatus("Saved");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [title, content, noteId]);

  return (
    <section className="panel grid gap-3 p-4">
      <input
        className="field text-xl font-bold"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <textarea
        className="field min-h-[28rem]"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <p className="text-sm text-slate-400">{status}</p>
    </section>
  );
}
