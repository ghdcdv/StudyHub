import { BillingButtons } from "@/components/billing-buttons";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function BillingPage() {
  const user = await requireUser();
  const subscription = await db.subscription.findUnique({
    where: { userId: user.id }
  });

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Billing</p>
        <h2 className="mt-1 text-3xl font-black">Stripe subscriptions</h2>
      </div>
      <section className="panel grid gap-4 p-5">
        <p className="text-slate-300">
          Current plan: <strong className="text-white">{user.plan}</strong>
        </p>
        {subscription ? (
          <p className="text-slate-400">
            Status {subscription.status}
            {subscription.currentPeriodEnd
              ? ` | Renews ${subscription.currentPeriodEnd.toLocaleDateString()}`
              : ""}
          </p>
        ) : null}
        <BillingButtons />
      </section>
    </div>
  );
}
