"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssignmentActions({
  id,
  completed
}: {
  id: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(status: "OPEN" | "COMPLETED") {
    setLoading(true);
    await fetch(`/api/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setLoading(false);
    router.refresh();
  }

  async function remove() {
    setLoading(true);
    await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="secondary-button"
        disabled={loading}
        onClick={() => update(completed ? "OPEN" : "COMPLETED")}
        type="button"
      >
        {completed ? "Reopen" : "Complete"}
      </button>
      <button className="secondary-button" disabled={loading} onClick={remove} type="button">
        Delete
      </button>
    </div>
  );
}
