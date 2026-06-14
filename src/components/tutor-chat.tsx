"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function TutorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = form.get("message")?.toString().trim();
    const subject = form.get("subject")?.toString().trim();
    const mode = form.get("mode")?.toString() || "STANDARD";
    if (!message) return;

    event.currentTarget.reset();
    setLoading(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: message },
      { role: "assistant", content: "" }
    ]);

    const response = await fetch("/api/ai/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        subject,
        mode,
        conversationId: conversationId ?? undefined
      })
    });

    const nextConversationId = response.headers.get("X-Conversation-Id");
    if (nextConversationId) setConversationId(nextConversationId);
    if (!response.body) {
      setLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      setMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, content: last.content + chunk };
        return next;
      });
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="panel min-h-[32rem] p-4">
        <div className="grid gap-4">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-app-line p-6 text-slate-400">
              Start a real AI tutor conversation. Responses stream from the server and are saved to Postgres.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-lg bg-blue-600/80 p-3"
                    : "markdown max-w-[90%] rounded-lg bg-white/7 p-3"
                }
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {message.content || (loading ? "Thinking..." : "")}
                </ReactMarkdown>
              </div>
            ))
          )}
        </div>
      </section>
      <form className="panel grid content-start gap-4 p-4" onSubmit={onSubmit}>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold">Subject</span>
          <input className="field" name="subject" />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold">Mode</span>
          <select className="field" name="mode" defaultValue="STANDARD">
            <option value="BEGINNER">Beginner</option>
            <option value="STANDARD">Standard</option>
            <option value="ADVANCED">Advanced</option>
            <option value="TEACHER">Teacher</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold">Message</span>
          <textarea className="field min-h-36" name="message" required />
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Streaming..." : "Send"}
        </button>
      </form>
    </div>
  );
}
