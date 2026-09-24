import { useEffect, useState } from "react";

import { ApiError, getFacultyAvailability, saveFacultyAvailability } from "../services/api";
import type { DayOfWeek, Faculty, UnavailablePeriod } from "../types";
import { ErrorState, LoadingState } from "./Status";

const DAYS: Array<{ key: DayOfWeek; label: string }> = [
  { key: "MONDAY", label: "Monday" },
  { key: "TUESDAY", label: "Tuesday" },
  { key: "WEDNESDAY", label: "Wednesday" },
  { key: "THURSDAY", label: "Thursday" },
  { key: "FRIDAY", label: "Friday" },
];

const PERIODS = [1, 2, 3, 4, 5, 6];

export function FacultyAvailabilityEditor({ faculty }: { faculty: Faculty[] }) {
  const [facultyId, setFacultyId] = useState(faculty[0]?.id ?? "");
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!faculty.some((member) => member.id === facultyId)) {
      setFacultyId(faculty[0]?.id ?? "");
    }
  }, [faculty, facultyId]);

  useEffect(() => {
    if (!facultyId) {
      setUnavailable(new Set());
      setReady(false);
      return;
    }
    let active = true;
    setLoading(true);
    setReady(false);
    setError(null);
    setNotice(null);
    getFacultyAvailability(facultyId)
      .then((result) => {
        if (active) {
          setUnavailable(toKeySet(result.unavailable));
          setReady(true);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageFrom(caught));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [facultyId]);

  function toggle(day: DayOfWeek, period: number) {
    if (saving) {
      return;
    }
    const cell = cellKey(day, period);
    setUnavailable((current) => {
      const next = new Set(current);
      if (next.has(cell)) {
        next.delete(cell);
      } else {
        next.add(cell);
      }
      return next;
    });
    setNotice(null);
  }

  async function onSave() {
    if (!facultyId) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveFacultyAvailability(facultyId, fromKeySet(unavailable));
      const refreshed = await getFacultyAvailability(facultyId);
      setUnavailable(toKeySet(refreshed.unavailable));
      setNotice("Availability saved.");
    } catch (caught: unknown) {
      setError(messageFrom(caught));
    } finally {
      setSaving(false);
    }
  }

  if (faculty.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Faculty availability</h2>
          <p className="mt-1 text-sm text-slate-600">A marked cell means the faculty member is unavailable.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Faculty</span>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            value={facultyId}
            onChange={(event) => setFacultyId(event.target.value)}
          >
            {faculty.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <div className="mt-4"><LoadingState message="Loading availability..." /></div> : null}
      {!loading && error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
      {!loading && notice ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>
      ) : null}

      {!loading && ready ? (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="px-2 py-2 text-left font-medium">Day</th>
                  {PERIODS.map((period) => (
                    <th key={period} className="px-2 py-2 text-center font-medium">
                      {period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day.key}>
                    <th className="px-2 py-2 text-left font-medium text-slate-700">{day.label}</th>
                    {PERIODS.map((period) => {
                      const blocked = unavailable.has(cellKey(day.key, period));
                      return (
                        <td key={period} className="px-1 py-1">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => toggle(day.key, period)}
                            className={`w-full rounded border px-2 py-3 text-xs font-medium ${
                              blocked
                                ? "border-amber-300 bg-amber-100 text-amber-950"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {blocked ? "Unavailable" : "Available"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      ) : null}
    </section>
  );
}

function cellKey(day: DayOfWeek, period: number): string {
  return `${day}:${period}`;
}

function toKeySet(periods: UnavailablePeriod[]): Set<string> {
  return new Set(periods.map((period) => cellKey(period.dayOfWeek, period.period)));
}

function fromKeySet(keys: Set<string>): UnavailablePeriod[] {
  return [...keys].map((key) => {
    const [dayOfWeek, period] = key.split(":");
    return { dayOfWeek: dayOfWeek as DayOfWeek, period: Number(period) };
  });
}

function messageFrom(error: unknown): string {
  return error instanceof ApiError ? error.message : "Unable to connect to the server. Please make sure the backend is running.";
}
