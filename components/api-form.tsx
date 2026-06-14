"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "datetime-local" | "select" | "json";
  required?: boolean;
  options?: string[];
  help?: string;
};

export function ApiForm({
  endpoint,
  method = "POST",
  fields,
  submitLabel,
  transform
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  fields: Field[];
  submitLabel: string;
  transform?: (payload: Record<string, unknown>) => Record<string, unknown>;
}) {
  const router = useRouter();
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");
    const form = new FormData(event.currentTarget);
    let payload: Record<string, unknown> = {};

    for (const field of fields) {
      const value = form.get(field.name)?.toString() ?? "";
      if (!value && !field.required) continue;
      if (field.type === "number") payload[field.name] = Number(value);
      else if (field.type === "datetime-local") payload[field.name] = new Date(value).toISOString();
      else if (field.type === "json") payload[field.name] = value ? JSON.parse(value) : undefined;
      else payload[field.name] = value;
    }

    if (transform) payload = transform(payload);

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    setResult(JSON.stringify(json, null, 2));
    if (response.ok) router.refresh();
    setLoading(false);
  }

  return (
    <form className="panel grid gap-4 p-4" onSubmit={onSubmit}>
      {fields.map((field) => (
        <label key={field.name} className="grid gap-2 text-sm text-slate-300">
          <span className="font-semibold text-white">{field.label}</span>
          {field.type === "textarea" || field.type === "json" ? (
            <textarea
              className="field min-h-32"
              name={field.name}
              required={field.required}
            />
          ) : field.type === "select" ? (
            <select className="field" name={field.name} required={field.required}>
              <option value="">Select</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="field"
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
            />
          )}
          {field.help ? <span className="text-xs text-slate-500">{field.help}</span> : null}
        </label>
      ))}
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? "Working..." : submitLabel}
      </button>
      {result ? (
        <pre className="max-h-96 overflow-auto rounded-lg bg-black/35 p-3 text-xs text-slate-200">
          {result}
        </pre>
      ) : null}
    </form>
  );
}
