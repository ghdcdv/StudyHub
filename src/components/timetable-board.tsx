"use client";

import { useState } from "react";

type ClassItem = {
  id: string;
  subject: string;
  dayOfWeek: number;
  startsAtMin: number;
  durationMin: number;
  color: string;
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TimetableBoard({ classes }: { classes: ClassItem[] }) {
  const [items, setItems] = useState(classes);

  async function move(id: string, dayOfWeek: number, startsAtMin: number) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, dayOfWeek, startsAtMin } : item
      )
    );
    await fetch(`/api/timetable/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek, startsAtMin })
    });
  }

  return (
    <div className="panel overflow-auto p-4">
      <div className="grid min-w-[48rem] grid-cols-[4rem_repeat(7,1fr)] gap-2">
        <span />
        {days.map((day) => (
          <strong key={day} className="text-center text-sm text-slate-300">
            {day}
          </strong>
        ))}
        {[8, 10, 12, 14, 16].map((hour) => (
          <Row
            key={hour}
            hour={hour}
            items={items}
            onMove={(id, day) => move(id, day, hour * 60)}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  hour,
  items,
  onMove
}: {
  hour: number;
  items: ClassItem[];
  onMove: (id: string, day: number) => void;
}) {
  return (
    <>
      <div className="py-5 text-sm text-slate-400">{hour}:00</div>
      {days.map((_, day) => (
        <div
          key={day}
          className="min-h-20 rounded-lg border border-app-line bg-white/5 p-2"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const id = event.dataTransfer.getData("text/plain");
            if (id) onMove(id, day);
          }}
        >
          {items
            .filter(
              (item) =>
                item.dayOfWeek === day &&
                item.startsAtMin >= hour * 60 &&
                item.startsAtMin < (hour + 2) * 60
            )
            .map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData("text/plain", item.id)
                }
                className="rounded-md px-2 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.subject}
              </div>
            ))}
        </div>
      ))}
    </>
  );
}
