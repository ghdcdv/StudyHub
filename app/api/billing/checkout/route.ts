import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl, requiredEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";

const schema = z.object({
  plan: z.enum(["PREMIUM", "TEAM"])
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    const price =
      body.plan === "TEAM"
        ? requiredEnv("STRIPE_TEAM_PRICE_ID")
        : requiredEnv("STRIPE_PREMIUM_PRICE_ID");
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id }
    });

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: subscription?.stripeCustomerId ?? undefined,
      customer_email: subscription?.stripeCustomerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl()}/billing?success=1`,
      cancel_url: `${appUrl()}/billing?canceled=1`,
      metadata: {
        userId: user.id,
        plan: body.plan
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: body.plan
        }
      }
    });

    return json({ url: session.url });
  } catch (error) {
    return handleApiError(error);
  }
}
