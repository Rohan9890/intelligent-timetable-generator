import { useEffect, useState } from "react";

import { ApiError, updateTimetableSlot } from "../services/api";
import type { Classroom, DayOfWeek, TimetableSlot } from "../types";

const DAYS: Array<{ key: DayOfWeek; label: string }> = [
  { key: "MONDAY", label: "Monday" },
  { key: "TUESDAY", label: "Tuesday" },
  { key: "WEDNESDAY", label: "Wednesday" },
  { key: "THURSDAY", label: "Thursday" },
  { key: "FRIDAY", label: "Friday" },
];

export function SlotEditor({
  slots,
  classrooms,
  onSaved,
}: {
  slots: TimetableSlot[];
  classrooms: Classroom[];
  onSaved: () => Promise<void>;
}) {
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(slots[0]?.dayOfWeek ?? "MONDAY");
  const [period, setPeriod] = useState(String(slots[0]?.period ?? 1));
  const [classroomId, setClassroomId] = useState(slots[0]?.classroom.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const selected = slots.find((slot) => slot.id === slotId) ?? slots[0];
    if (!selected) {
      return;
    }
    setSlotId(selected.id);
    setDayOfWeek(selected.dayOfWeek);
    setPeriod(String(selected.period));
    setClassroomId(selected.classroom.id);
  }, [slots, slotId]);

  function chooseSlot(id: string) {
    const selected = slots.find((slot) => slot.id === id);
    if (!selected) {
      return;
    }
    setSlotId(selected.id);
    setDayOfWeek(selected.dayOfWeek);
    setPeriod(String(selected.period));
    setClassroomId(selected.classroom.id);
    setError(null);
    setNotice(null);
  }

  async function onSave() {
    const periodNumber = Number(period);
    if (!slotId || !classroomId || !Number.isInteger(periodNumber)) {
      setError("Choose a class, day, period, and classroom.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await updateTimetableSlot(slotId, { dayOfWeek, period: periodNumber, classroomId });
      await onSaved();
      setNotice("Slot updated.");
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (slots.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Edit slot</h2>
      <p className="mt-1 text-sm text-slate-600">Change the day, period, or classroom. Invalid moves are not saved.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Class
          <select className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" value={slotId} onChange={(event) => chooseSlot(event.target.value)}>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.subject.name} · {slot.division.name} · {DAYS.find((day) => day.key === slot.dayOfWeek)?.label} P{slot.period}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Day
          <select className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value as DayOfWeek)}>
            {DAYS.map((day) => (
              <option key={day.key} value={day.key}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Period
          <select className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Classroom
          <select className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
            {classrooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-emerald-800">{notice}</p> : null}
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving}
        className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300"
      >
        {saving ? "Saving..." : "Save change"}
      </button>
    </section>
  );
}
