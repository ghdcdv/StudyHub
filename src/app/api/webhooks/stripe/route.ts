import { Plan, SubscriptionStatus } from "@prisma/client";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { optionalEnv, requiredEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Invalid webhook",
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId ?? session.client_reference_id;
    const plan = toPlan(session.metadata?.plan);
    if (userId && session.customer && session.subscription) {
      await upsertSubscription({
        userId,
        plan,
        stripeCustomerId: String(session.customer),
        stripeSubscriptionId: String(session.subscription),
        status: SubscriptionStatus.ACTIVE
      });
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    if (userId) {
      await upsertSubscription({
        userId,
        plan: toPlan(subscription.metadata?.plan),
        stripeCustomerId: String(subscription.customer),
        stripeSubscriptionId: subscription.id,
        status:
          event.type === "customer.subscription.deleted"
            ? SubscriptionStatus.CANCELED
            : toStatus(subscription.status),
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : undefined
      });
    }
  }

  return new Response("ok");
}

async function upsertSubscription({
  userId,
  plan,
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  currentPeriodEnd
}: {
  userId: string;
  plan: Plan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: Date;
}) {
  await db.$transaction([
    db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status,
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodEnd
      },
      update: {
        plan,
        status,
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodEnd
      }
    }),
    db.user.update({
      where: { id: userId },
      data: {
        plan: status === SubscriptionStatus.ACTIVE ? plan : Plan.FREE
      }
    })
  ]);
}

function toPlan(value: string | null | undefined): Plan {
  if (value === "TEAM") return Plan.TEAM;
  if (value === "PREMIUM") return Plan.PREMIUM;
  const premium = optionalEnv("STRIPE_PREMIUM_PRICE_ID");
  const team = optionalEnv("STRIPE_TEAM_PRICE_ID");
  if (value === team) return Plan.TEAM;
  if (value === premium) return Plan.PREMIUM;
  return Plan.FREE;
}

function toStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active") return SubscriptionStatus.ACTIVE;
  if (status === "trialing") return SubscriptionStatus.TRIALING;
  if (status === "past_due") return SubscriptionStatus.PAST_DUE;
  if (status === "canceled" || status === "unpaid") {
    return SubscriptionStatus.CANCELED;
  }
  return SubscriptionStatus.INACTIVE;
}
