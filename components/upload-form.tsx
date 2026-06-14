"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function UploadForm({
  endpoint,
  label,
  accept,
  extraFields
}: {
  endpoint: string;
  label: string;
  accept: string;
  extraFields?: React.ReactNode;
}) {
  const router = useRouter();
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(endpoint, {
      method: "POST",
      body: form
    });
    const json = await response.json();
    setResult(JSON.stringify(json, null, 2));
    if (response.ok) router.refresh();
    setLoading(false);
  }

  return (
    <form className="panel grid gap-4 p-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm text-slate-300">
        <span className="font-semibold text-white">{label}</span>
        <input className="field" name="file" type="file" accept={accept} required />
      </label>
      {extraFields}
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? "Processing..." : "Upload and process"}
      </button>
      {result ? (
        <pre className="max-h-96 overflow-auto rounded-lg bg-black/35 p-3 text-xs text-slate-200">
          {result}
        </pre>
      ) : null}
    </form>
  );
}
