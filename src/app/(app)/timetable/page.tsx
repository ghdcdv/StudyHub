import { ApiForm } from "@/components/api-form";
import { TimetableBoard } from "@/components/timetable-board";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TimetablePage() {
  const user = await requireUser();
  const classes = await db.timetableClass.findMany({
    where: { userId: user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startsAtMin: "asc" }]
  });

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          Timetable
        </p>
        <h2 className="mt-1 text-3xl font-black">Drag classes to reschedule</h2>
      </div>
      <TimetableBoard classes={classes} />
      <ApiForm
        endpoint="/api/timetable"
        submitLabel="Add class"
        fields={[
          { name: "subject", label: "Subject", required: true },
          { name: "location", label: "Location" },
          { name: "teacher", label: "Teacher" },
          { name: "dayOfWeek", label: "Day of week 0-6", type: "number", required: true },
          { name: "startsAtMin", label: "Start minute of day", type: "number", required: true },
          { name: "durationMin", label: "Duration minutes", type: "number", required: true },
          { name: "color", label: "Color hex", required: true }
        ]}
      />
    </div>
  );
}
