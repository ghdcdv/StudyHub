import { handleApiError, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const [
      users,
      premiumUsers,
      teamUsers,
      activeSubscriptions,
      aiUsage,
      uploads,
      reports
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { plan: "PREMIUM" } }),
      db.user.count({ where: { plan: "TEAM" } }),
      db.subscription.count({ where: { status: "ACTIVE" } }),
      db.aiUsage.groupBy({
        by: ["feature"],
        _sum: { input: true, output: true },
        _count: true
      }),
      db.upload.count(),
      db.notification.count({ where: { type: "SYSTEM" } })
    ]);

    return json({
      users,
      premiumUsers,
      teamUsers,
      activeSubscriptions,
      uploads,
      reports,
      aiUsage
    });
  } catch (error) {
    return handleApiError(error);
  }
}
