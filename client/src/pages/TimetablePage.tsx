import { useEffect, useMemo, useState } from "react";

import { ConflictPanel } from "../components/ConflictPanel";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { SlotEditor } from "../components/SlotEditor";
import { TimetableGrid } from "../components/TimetableGrid";
import { useDepartment } from "../hooks/DepartmentContext";
import {
  ApiError,
  generateTimetable,
  getClassrooms,
  getDivisions,
  getFaculty,
  getTimetable,
} from "../services/api";
import type { Classroom, ConflictReport, Division, Faculty, TimetableSlot } from "../types";

type View = "division" | "faculty" | "room";

export function TimetablePage() {
  const { selected, selectedId, loading: departmentsLoading, error: departmentError } = useDepartment();
  const [slots, setSlots] = useState<TimetableSlot[] | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [view, setView] = useState<View>("division");
  const [entityId, setEntityId] = useState("");
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
    Promise.all([
      getTimetable(selectedId).catch(keepNotFound),
      getDivisions(),
      getFaculty(),
      getClassrooms(),
    ])
      .then(([timetable, divisionRows, facultyRows, roomRows]) => {
        if (!active) {
          return;
        }
        const departmentDivisions = divisionRows.filter((item) => item.departmentId === selectedId);
        const departmentFaculty = facultyRows.filter((item) => item.departmentId === selectedId);
        setSlots(timetable ? timetable.slots : null);
        setDivisions(departmentDivisions);
        setFaculty(departmentFaculty);
        setRooms(roomRows);
        setView("division");
        setEntityId(departmentDivisions[0]?.id ?? "");
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

  const options = view === "division" ? divisions : view === "faculty" ? faculty : rooms;

  useEffect(() => {
    if (!options.some((item) => item.id === entityId)) {
      setEntityId(options[0]?.id ?? "");
    }
  }, [options, entityId]);

  const visibleSlots = useMemo(() => {
    if (!slots) {
      return [];
    }
    if (view === "division") {
      return slots.filter((slot) => slot.division.id === entityId);
    }
    if (view === "faculty") {
      return slots.filter((slot) => slot.faculty.id === entityId);
    }
    return slots.filter((slot) => slot.classroom.id === entityId);
  }, [slots, view, entityId]);

  async function onGenerate() {
    if (!selectedId) {
      return;
    }
    setGenerating(true);
    setNotice(null);
    setConflicts([]);
    try {
      const result = await generateTimetable(selectedId);
      if (!result.success) {
        setConflicts(result.conflicts);
        return;
      }
      const timetable = await getTimetable(selectedId);
      setSlots(timetable.slots);
      setNotice(`Timetable generated successfully. ${result.slotCount} periods scheduled.`);
    } catch (caught: unknown) {
      setError(messageFrom(caught));
    } finally {
      setGenerating(false);
    }
  }

  if (departmentsLoading || loading) {
    return <LoadingState message="Loading timetable..." />;
  }
  if (departmentError || error) {
    return <ErrorState message={departmentError ?? error ?? "Unable to load the timetable."} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Timetable</h1>
          <p className="mt-1 text-sm text-slate-600">{selected?.name}</p>
          {slots !== null ? (
            <p className="mt-1 text-sm font-medium text-slate-800">{slots.length} scheduled periods</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={generating || !selectedId}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300"
        >
          {generating ? "Generating timetable..." : "Generate Timetable"}
        </button>
      </div>

      {notice ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p> : null}
      {conflicts.length > 0 ? <ConflictPanel conflicts={conflicts} /> : null}

      {slots === null ? (
        <EmptyState
          title="No timetable generated yet."
          description="Generate a timetable for this department to see the weekly schedule."
          action={
            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={generating}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300"
            >
              {generating ? "Generating timetable..." : "Generate Timetable"}
            </button>
          }
        />
      ) : null}

      {slots !== null ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
              {(["division", "faculty", "room"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={`rounded px-3 py-1.5 text-sm capitalize ${view === item ? "bg-slate-900 text-white" : "text-slate-700"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
            >
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <TimetableGrid slots={visibleSlots} />
          <SlotEditor
            slots={visibleSlots}
            classrooms={rooms}
            onSaved={async () => {
              if (!selectedId) {
                return;
              }
              const timetable = await getTimetable(selectedId);
              setSlots(timetable.slots);
            }}
          />
        </>
      ) : null}
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
