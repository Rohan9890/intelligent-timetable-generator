import { NavLink, Outlet } from "react-router-dom";

import { useDepartment } from "../hooks/DepartmentContext";

const LINKS = [
  { to: "/", label: "Overview", end: true },
  { to: "/timetable", label: "Timetable", end: false },
  { to: "/history", label: "History", end: false },
  { to: "/faculty", label: "Faculty", end: false },
  { to: "/subjects", label: "Subjects", end: false },
  { to: "/divisions", label: "Divisions", end: false },
  { to: "/classrooms", label: "Classrooms", end: false },
  { to: "/assignments", label: "Assignments", end: false },
];

export function Layout() {
  const { departments, selectedId, setSelectedId, loading } = useDepartment();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-100">
        <div className="border-b border-slate-700 px-5 py-5">
          <p className="text-lg font-semibold tracking-tight">SmartSchedule</p>
          <p className="mt-1 text-xs text-slate-400">Timetable coordination</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${isActive ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <p className="text-sm text-slate-500">College timetable workspace</p>
          <label className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Department</span>
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
              value={selectedId}
              disabled={loading || departments.length === 0}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        </header>
        <main className="px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
