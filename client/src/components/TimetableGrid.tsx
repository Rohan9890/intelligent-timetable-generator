import type { DayOfWeek, TimetableSlot } from "../types";

const DAYS: Array<{ key: DayOfWeek; label: string }> = [
  { key: "MONDAY", label: "Mon" },
  { key: "TUESDAY", label: "Tue" },
  { key: "WEDNESDAY", label: "Wed" },
  { key: "THURSDAY", label: "Thu" },
  { key: "FRIDAY", label: "Fri" },
];

const PERIODS = [1, 2, 3, 4, 5, 6];

export function TimetableGrid({ slots }: { slots: TimetableSlot[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="w-28 border-b border-slate-200 px-3 py-3 font-medium">Period</th>
            {DAYS.map((day) => (
              <th key={day.key} className="border-b border-l border-slate-200 px-3 py-3 font-medium">
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((period) => (
            <tr key={period}>
              <th className="border-t border-slate-200 px-3 py-3 align-top font-medium text-slate-700">
                Period {period}
              </th>
              {DAYS.map((day) => {
                const matches = slots.filter((slot) => slot.dayOfWeek === day.key && slot.period === period);
                return (
                  <td key={day.key} className="border-t border-l border-slate-200 px-3 py-3 align-top">
                    {matches.length === 0 ? (
                      <span className="text-slate-400">Free</span>
                    ) : (
                      matches.map((slot) => (
                        <div key={slot.id} className="mb-2 last:mb-0">
                          <p className="font-semibold text-slate-900">{slot.subject.name}</p>
                          <p className="text-slate-700">{slot.faculty.name}</p>
                          <p className="text-slate-500">{slot.classroom.name}</p>
                          {slot.isManual ? <p className="text-xs font-medium text-slate-500">Edited</p> : null}
                        </div>
                      ))
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
