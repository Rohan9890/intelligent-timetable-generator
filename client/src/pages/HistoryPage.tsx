import { useEffect, useState } from "react";

import { ConflictPanel } from "../components/ConflictPanel";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { useDepartment } from "../hooks/DepartmentContext";
import { ApiError, getGenerationHistory } from "../services/api";
import type { GenerationHistoryEntry } from "../types";

export function HistoryPage() {
  const { selected, selectedId, loading: departmentsLoading, error: departmentError } = useDepartment();
  const [history, setHistory] = useState<GenerationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setOpenId(null);
    getGenerationHistory(selectedId)
      .then((rows) => {
        if (!active) {
          return;
        }
        setHistory(rows);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Unable to connect to the server. Please make sure the backend is running.");
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

  if (departmentsLoading || loading) {
    return <LoadingState message="Loading generation history..." />;
  }
  if (departmentError || error) {
    return <ErrorState message={departmentError ?? error ?? "Unable to load generation history."} />;
  }

  const activeRun = history.find((run) => run.isActive && run.status === "SUCCESS");
  const latestFailed = history[0]?.status === "FAILED";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Generation History</h1>
        <p className="mt-1 text-sm text-slate-600">{selected?.name}</p>
      </div>

      {latestFailed && activeRun ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          The latest attempt failed. The previous successful timetable is still active, with {activeRun.slotCount} scheduled periods.
        </p>
      ) : null}

      {history.length === 0 ? (
        <EmptyState
          title="No generation attempts yet."
          description="Generate a timetable for this department to see success and failure history here."
        />
      ) : (
        <div className="space-y-4">
          {history.map((run) => (
            <article key={run.id} className="rounded-md border border-slate-200 bg-white">
              <div className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold tracking-wide ${
                      run.status === "SUCCESS" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"
                    }`}
                  >
                    {run.status}
                  </span>
                  {run.isActive ? (
                    <span className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold tracking-wide text-white">Active timetable</span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-800">{run.summary}</p>
                <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Started</dt>
                    <dd>{formatWhen(run.createdAt)}</dd>
                  </div>
                  {run.completedAt ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Completed</dt>
                      <dd>{formatWhen(run.completedAt)}</dd>
                    </div>
                  ) : null}
                  {run.slotCount !== null ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Generated slots</dt>
                      <dd className="font-medium text-slate-900">{run.slotCount}</dd>
                    </div>
                  ) : (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Generated slots</dt>
                      <dd>None saved</dd>
                    </div>
                  )}
                </dl>
                {run.status === "FAILED" ? (
                  <p className="mt-3 text-sm text-slate-600">This attempt did not replace the active timetable.</p>
                ) : null}
              </div>
              {run.status === "FAILED" && run.conflicts.length > 0 ? (
                <div className="border-t border-slate-200 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setOpenId((current) => (current === run.id ? null : run.id))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800"
                  >
                    {openId === run.id ? "Hide conflicts" : "View conflicts"}
                  </button>
                  {openId === run.id ? (
                    <div className="mt-4">
                      <ConflictPanel conflicts={run.conflicts} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
