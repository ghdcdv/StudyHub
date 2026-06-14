import "server-only";

import Stripe from "stripe";
import { requiredEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function stripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
  }

  return stripeClient;
}
