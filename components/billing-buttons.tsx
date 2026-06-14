"use client";

import { useState } from "react";

export function BillingButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(plan: "PREMIUM" | "TEAM") {
    setLoading(plan);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });
    const data = (await response.json()) as { url?: string; error?: string };
    setLoading(null);
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Could not start checkout");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        className="primary-button"
        disabled={loading !== null}
        onClick={() => checkout("PREMIUM")}
        type="button"
      >
        {loading === "PREMIUM" ? "Opening..." : "Upgrade to Premium"}
      </button>
      <button
        className="secondary-button"
        disabled={loading !== null}
        onClick={() => checkout("TEAM")}
        type="button"
      >
        {loading === "TEAM" ? "Opening..." : "Start Team Plan"}
      </button>
    </div>
  );
}
