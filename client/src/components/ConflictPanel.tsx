import type { ConflictReport } from "../types";

export function ConflictPanel({ conflicts }: { conflicts: ConflictReport[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-5 py-4">
        <p className="text-base font-semibold text-amber-950">Generation could not be completed</p>
        <p className="mt-1 text-sm text-amber-900">
          The timetable was not replaced. Review the constraint below and adjust the setup.
        </p>
      </div>
      {conflicts.map((conflict) => (
        <article key={`${conflict.assignmentId}-${conflict.reasonCode}`} className="rounded-md border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Problem</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{conflict.evidence.subjectName}</h3>
            <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-semibold tracking-wide text-amber-900">
              {conflict.reasonCode.replaceAll("_", " ")}
            </p>
          </header>
          <div className="space-y-4 px-5 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Why it happened</p>
              <p className="mt-1 text-sm leading-6 text-slate-800">{conflict.summary}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded border border-slate-200 px-3 py-2">
                  <dt className="text-slate-500">Required periods</dt>
                  <dd className="font-semibold">{conflict.requiredPeriods}</dd>
                </div>
                <div className="rounded border border-slate-200 px-3 py-2">
                  <dt className="text-slate-500">Compatible periods</dt>
                  <dd className="font-semibold">{conflict.compatiblePeriods}</dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">What can be done</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {conflict.possibleActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
