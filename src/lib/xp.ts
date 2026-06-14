import "server-only";

import { db } from "@/lib/db";

export const XP = {
  QUIZ_COMPLETED: 100,
  FLASHCARD_REVIEWED: 20,
  STUDY_SESSION: 50,
  ASSIGNMENT_COMPLETED: 100
} as const;

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

export async function awardXp(userId: string, amount: number): Promise<void> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const nextXp = user.xp + amount;
  await db.user.update({
    where: { id: userId },
    data: {
      xp: nextXp,
      level: levelForXp(nextXp)
    }
  });
  await evaluateBadges(userId);
}

export async function evaluateBadges(userId: string): Promise<void> {
  const [quizAttempts, assignments, flashcardReviews, sessions] =
    await Promise.all([
      db.quizAttempt.count({ where: { userId, accuracy: { gte: 0.9 } } }),
      db.assignment.count({ where: { userId, status: "COMPLETED" } }),
      db.flashcardReview.count({ where: { userId } }),
      db.studySession.count({ where: { userId } })
    ]);

  const earned = [
    {
      code: "PERFECT_QUIZ",
      title: "Perfect Quiz",
      description: "Score 90% or higher on a quiz.",
      active: quizAttempts >= 1,
      rule: { quizAccuracyGte: 0.9 }
    },
    {
      code: "HOMEWORK_HERO",
      title: "Homework Hero",
      description: "Complete 10 assignments.",
      active: assignments >= 10,
      rule: { completedAssignmentsGte: 10 }
    },
    {
      code: "MEMORY_BUILDER",
      title: "Memory Builder",
      description: "Review 50 flashcards.",
      active: flashcardReviews >= 50,
      rule: { flashcardReviewsGte: 50 }
    },
    {
      code: "EARLY_BIRD",
      title: "Early Bird",
      description: "Complete 7 study sessions.",
      active: sessions >= 7,
      rule: { studySessionsGte: 7 }
    }
  ];

  for (const badge of earned.filter((item) => item.active)) {
    const definition = await db.badgeDefinition.upsert({
      where: { code: badge.code },
      create: {
        code: badge.code,
        title: badge.title,
        description: badge.description,
        rule: badge.rule
      },
      update: {
        title: badge.title,
        description: badge.description,
        rule: badge.rule
      }
    });

    await db.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: definition.id } },
      create: { userId, badgeId: definition.id },
      update: {}
    });
  }
}
