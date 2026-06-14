import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
        Global Student Super-App
      </p>
      <h1 className="max-w-3xl text-4xl font-black text-white md:text-6xl">
        A real student SaaS platform, backed by auth, Postgres, AI, storage, and billing.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
        Sign in to use AI tutoring, upload homework, generate flashcards and quizzes,
        plan revision, store notes, query your knowledge vault, and collaborate with study groups.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="primary-button" href="/sign-up">
          Create account
        </Link>
        <Link className="secondary-button" href="/sign-in">
          Sign in
        </Link>
      </div>
    </main>
  );
}
