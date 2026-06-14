import { TutorChat } from "@/components/tutor-chat";

export default function AiTutorPage() {
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">AI Tutor</p>
        <h2 className="mt-1 text-3xl font-black">Streaming tutor chat</h2>
      </div>
      <TutorChat />
    </div>
  );
}
