import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  MessageSquare,
  NotebookTabs,
  ScanLine,
  Shield,
  Sparkles,
  UserRound,
  Trophy,
  Users
} from "lucide-react";
import type { User } from "@prisma/client";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/ai-tutor", label: "AI Tutor", icon: MessageSquare },
  { href: "/homework", label: "Homework", icon: ScanLine },
  { href: "/flashcards", label: "Flashcards", icon: NotebookTabs },
  { href: "/quizzes", label: "Quizzes", icon: ClipboardList },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/timetable", label: "Timetable", icon: BookOpen },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/revision", label: "Revision", icon: Trophy },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/vault", label: "Knowledge Vault", icon: Sparkles },
  { href: "/groups", label: "Study Groups", icon: Users },
  { href: "/career", label: "Career Coach", icon: GraduationCap },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/admin", label: "Admin", icon: Shield }
];

export function AppShell({
  user,
  children
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="border-b border-app-line bg-black/25 p-4 backdrop-blur md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <Link href="/dashboard" className="mb-5 flex items-center gap-3 font-black">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
            S
          </span>
          <span>StudyHub</span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto md:grid md:overflow-visible">
          {nav
            .filter((item) => item.href !== "/admin" || user.role === "ADMIN")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-app-line bg-[#071018]/82 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Level {user.level}
            </p>
            <h1 className="font-bold text-white">{user.name ?? user.email}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-lg border border-app-line px-3 py-2 text-sm text-slate-300 sm:flex">
              <Trophy size={16} className="text-amber-300" />
              {user.xp} XP
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
