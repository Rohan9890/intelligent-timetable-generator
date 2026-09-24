import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ConflictPanel } from "../components/ConflictPanel";
import { ErrorState, LoadingState } from "../components/Status";
import { useDepartment } from "../hooks/DepartmentContext";
import { ApiError, generateTimetable, getClassrooms, getDivisions, getFaculty, getSubjects, getTimetable } from "../services/api";
import type { ConflictReport } from "../types";

export function OverviewPage() {
  const { selected, selectedId, loading: departmentsLoading, error: departmentError } = useDepartment();
  const [counts, setCounts] = useState({ faculty: 0, subjects: 0, divisions: 0, classrooms: 0 });
  const [slotCount, setSlotCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictReport[]>([]);

  useEffect(() => {
    if (!selectedId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setNotice(null);
    setConflicts([]);
    Promise.all([getFaculty(), getSubjects(), getDivisions(), getClassrooms(), getTimetable(selectedId).catch(keepNotFound)])
      .then(([faculty, subjects, divisions, classrooms, timetable]) => {
        if (!active) {
          return;
        }
        setCounts({
          faculty: faculty.filter((item) => item.departmentId === selectedId).length,
          subjects: subjects.filter((item) => item.departmentId === selectedId).length,
          divisions: divisions.filter((item) => item.departmentId === selectedId).length,
          classrooms: classrooms.length,
        });
        setSlotCount(timetable ? timetable.slots.length : null);
        setError(null);
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
  }, [selectedId]);

  async function onGenerate() {
    if (!selectedId) {
      return;
    }
    setGenerating(true);
    setNotice(null);
    setConflicts([]);
    try {
      const result = await generateTimetable(selectedId);
      if (result.success) {
        setSlotCount(result.slotCount);
        setNotice(`Timetable generated successfully. ${result.slotCount} periods scheduled.`);
      } else {
        setConflicts(result.conflicts);
      }
    } catch (caught: unknown) {
      setError(messageFrom(caught));
    } finally {
      setGenerating(false);
    }
  }

  const blocked = departmentsLoading || loading;
  const problem = departmentError ?? error;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-slate-600">{selected?.name ?? "No department selected"}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/timetable" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">
            View Timetable
          </Link>
          <button
            type="button"
            onClick={() => void onGenerate()}
            disabled={generating || !selectedId}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300"
          >
            {generating ? "Generating timetable..." : "Generate Timetable"}
          </button>
        </div>
      </div>

      {blocked ? <LoadingState message="Loading overview..." /> : null}
      {!blocked && problem ? <ErrorState message={problem} /> : null}
      {!blocked && !problem && notice ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p> : null}
      {!blocked && !problem && conflicts.length > 0 ? <ConflictPanel conflicts={conflicts} /> : null}

      {!blocked && !problem ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Stat label="Faculty" value={counts.faculty} />
            <Stat label="Subjects" value={counts.subjects} />
            <Stat label="Divisions" value={counts.divisions} />
            <Stat label="Classrooms" value={counts.classrooms} />
          </div>
          <section className="rounded-md border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Generation status</p>
            <p className="mt-2 text-lg font-semibold">{slotCount === null ? "Not generated" : "Generated"}</p>
            <p className="mt-1 text-sm text-slate-600">
              {slotCount === null ? "No active timetable for this department." : `${slotCount} scheduled periods`}
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function keepNotFound(error: unknown): null {
  if (error instanceof ApiError && error.status === 404) {
    return null;
  }
  throw error;
}

function messageFrom(error: unknown): string {
  return error instanceof ApiError ? error.message : "Unable to connect to the server. Please make sure the backend is running.";
}
