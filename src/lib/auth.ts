import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { UserRole, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/env";

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(): Promise<User> {
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError();
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) {
    throw new UnauthorizedError();
  }

  const role = adminEmails().includes(email) ? UserRole.ADMIN : UserRole.STUDENT;
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    clerkUser?.username ||
    email;

  return db.user.upsert({
    where: { clerkId: userId },
    create: {
      clerkId: userId,
      email,
      name,
      role
    },
    update: {
      email,
      name,
      role
    }
  });
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) {
    throw new UnauthorizedError();
  }

  return user;
}
