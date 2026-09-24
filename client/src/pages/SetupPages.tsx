import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { DataTable } from "../components/DataTable";
import { FacultyAvailabilityEditor } from "../components/FacultyAvailabilityEditor";
import { ErrorState, LoadingState } from "../components/Status";
import { useDepartment } from "../hooks/DepartmentContext";
import {
  ApiError,
  createAssignment,
  createClassroom,
  createDivision,
  createFaculty,
  createSubject,
  deleteAssignment,
  deleteClassroom,
  deleteDivision,
  deleteFaculty,
  deleteSubject,
  getAssignments,
  getClassrooms,
  getDivisions,
  getFaculty,
  getSubjects,
  updateAssignment,
  updateClassroom,
  updateDivision,
  updateFaculty,
  updateSubject,
} from "../services/api";
import type { Assignment, Classroom, Division, Faculty, Subject } from "../types";

export function FacultyPage() {
  const { selectedId } = useDepartment();
  const page = useDepartmentRows("Loading faculty...", getFaculty);
  const actions = useRowActions(page.reload);
  return (
    <SetupShell title="Faculty" loading={page.loading} error={page.error}>
      <AddFaculty departmentId={selectedId} onCreated={page.reload} />
      <ActionNotice notice={actions.notice} error={actions.error} />
      {actions.editing && page.rows.some((item) => item.id === actions.editing?.id) ? (
        <EditFaculty faculty={actions.editing as Faculty} onSaved={actions.saved} onCancel={actions.cancel} />
      ) : null}
      <DataTable
        columns={["Name", "Email", "Department", ""]}
        empty="No faculty in this department."
        rows={page.rows.map((item) => [
          item.name,
          item.email,
          page.departmentName,
          <RowActions key={item.id} deleting={actions.deletingId === item.id} onEdit={() => actions.edit(item)} onDelete={() => void actions.remove(item.id, "Are you sure you want to delete this faculty member?", () => deleteFaculty(item.id))} />,
        ])}
      />
      <FacultyAvailabilityEditor faculty={page.rows} />
    </SetupShell>
  );
}

export function SubjectsPage() {
  const { selectedId } = useDepartment();
  const page = useDepartmentRows("Loading subjects...", getSubjects);
  const actions = useRowActions(page.reload);
  return (
    <SetupShell title="Subjects" loading={page.loading} error={page.error}>
      <AddSubject departmentId={selectedId} onCreated={page.reload} />
      <ActionNotice notice={actions.notice} error={actions.error} />
      {actions.editing && page.rows.some((item) => item.id === actions.editing?.id) ? (
        <EditSubject subject={actions.editing as Subject} onSaved={actions.saved} onCancel={actions.cancel} />
      ) : null}
      <DataTable
        columns={["Name", "Code", "Department", "Type", ""]}
        empty="No subjects in this department."
        rows={page.rows.map((item) => [
          item.name,
          item.code,
          page.departmentName,
          item.isLab ? "Lab" : "Theory",
          <RowActions key={item.id} deleting={actions.deletingId === item.id} onEdit={() => actions.edit(item)} onDelete={() => void actions.remove(item.id, "Are you sure you want to delete this subject?", () => deleteSubject(item.id))} />,
        ])}
      />
    </SetupShell>
  );
}

export function DivisionsPage() {
  const { selectedId } = useDepartment();
  const page = useDepartmentRows("Loading divisions...", getDivisions);
  const actions = useRowActions(page.reload);
  return (
    <SetupShell title="Divisions" loading={page.loading} error={page.error}>
      <AddDivision departmentId={selectedId} onCreated={page.reload} />
      <ActionNotice notice={actions.notice} error={actions.error} />
      {actions.editing && page.rows.some((item) => item.id === actions.editing?.id) ? (
        <EditDivision division={actions.editing as Division} onSaved={actions.saved} onCancel={actions.cancel} />
      ) : null}
      <DataTable
        columns={["Name", "Department", "Students", ""]}
        empty="No divisions in this department."
        rows={page.rows.map((item) => [
          item.name,
          page.departmentName,
          String(item.studentCount),
          <RowActions key={item.id} deleting={actions.deletingId === item.id} onEdit={() => actions.edit(item)} onDelete={() => void actions.remove(item.id, "Are you sure you want to delete this division?", () => deleteDivision(item.id))} />,
        ])}
      />
    </SetupShell>
  );
}

export function ClassroomsPage() {
  const { loading: departmentsLoading, error: departmentError } = useDepartment();
  const [rows, setRows] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((current) => current + 1);
  const actions = useRowActions(reload);

  useEffect(() => {
    let active = true;
    getClassrooms()
      .then((classrooms) => {
        if (active) {
          setRows(classrooms);
          setError(null);
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
  }, [reloadKey]);

  return (
    <SetupShell title="Classrooms" loading={departmentsLoading || loading} error={departmentError ?? error} note="Classrooms are shared across departments.">
      <AddClassroom onCreated={reload} />
      <ActionNotice notice={actions.notice} error={actions.error} />
      {actions.editing && rows.some((room) => room.id === actions.editing?.id) ? (
        <EditClassroom classroom={actions.editing as Classroom} onSaved={actions.saved} onCancel={actions.cancel} />
      ) : null}
      <DataTable
        columns={["Name", "Capacity", "Type", ""]}
        empty="No classrooms have been added."
        rows={rows.map((room) => [
          room.name,
          String(room.capacity),
          room.roomType === "LAB" ? "Lab" : "Classroom",
          <RowActions key={room.id} deleting={actions.deletingId === room.id} onEdit={() => actions.edit(room)} onDelete={() => void actions.remove(room.id, "Are you sure you want to delete this classroom?", () => deleteClassroom(room.id))} />,
        ])}
      />
    </SetupShell>
  );
}

export function AssignmentsPage() {
  const { selectedId, selected, loading: departmentsLoading, error: departmentError } = useDepartment();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((current) => current + 1);
  const actions = useRowActions(reload);

  useEffect(() => {
    if (selectedId) {
      setLoading(true);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([getAssignments(), getDivisions(), getFaculty(), getSubjects()])
      .then(([assignments, divisionRows, facultyRows, subjectRows]) => {
        if (!active) {
          return;
        }
        const departmentDivisions = divisionRows.filter((division) => division.departmentId === selectedId);
        const divisionIds = new Set(departmentDivisions.map((division) => division.id));
        setDivisions(departmentDivisions);
        setFaculty(facultyRows.filter((member) => member.departmentId === selectedId));
        setSubjects(subjectRows.filter((subject) => subject.departmentId === selectedId));
        setRows(assignments.filter((assignment) => divisionIds.has(assignment.division.id)));
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
  }, [selectedId, reloadKey]);

  return (
    <SetupShell title="Assignments" loading={departmentsLoading || loading} error={departmentError ?? error}>
      <AddAssignment
        subjects={subjects}
        divisions={divisions}
        faculty={faculty}
        onCreated={reload}
      />
      <ActionNotice notice={actions.notice} error={actions.error} />
      {actions.editing && rows.some((item) => item.id === actions.editing?.id) ? (
        <EditAssignment
          assignment={actions.editing as Assignment}
          subjects={subjects}
          divisions={divisions}
          faculty={faculty}
          onSaved={actions.saved}
          onCancel={actions.cancel}
        />
      ) : null}
      <DataTable
        columns={["Subject", "Division", "Faculty", "Periods / week", ""]}
        empty={`No assignments for ${selected?.name ?? "this department"}.`}
        rows={rows.map((assignment) => [
          assignment.subject.name,
          assignment.division.name,
          assignment.faculty.name,
          String(assignment.periodsPerWeek),
          <RowActions key={assignment.id} deleting={actions.deletingId === assignment.id} onEdit={() => actions.edit(assignment)} onDelete={() => void actions.remove(assignment.id, "Are you sure you want to delete this assignment?", () => deleteAssignment(assignment.id))} />,
        ])}
      />
    </SetupShell>
  );
}

function useDepartmentRows<T extends Faculty | Subject | Division>(
  loadingMessage: string,
  load: () => Promise<T[]>,
) {
  const { selectedId, selected, loading: departmentsLoading, error: departmentError } = useDepartment();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const showLoading = useRef(true);

  useEffect(() => {
    showLoading.current = true;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setLoading(departmentsLoading);
      return;
    }
    let active = true;
    if (showLoading.current) {
      setLoading(true);
    }
    load()
      .then((items) => {
        if (!active) {
          return;
        }
        setRows(items.filter((item) => item.departmentId === selectedId));
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageFrom(caught));
        }
      })
      .finally(() => {
        showLoading.current = false;
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedId, departmentsLoading, load, reloadKey]);

  return {
    rows,
    departmentName: selected?.name ?? "",
    loading: departmentsLoading || loading,
    error: departmentError ?? error,
    loadingMessage,
    reload: () => setReloadKey((current) => current + 1),
  };
}

function SetupShell({
  title,
  loading,
  error,
  note,
  children,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {note ? <p className="mt-1 text-sm text-slate-600">{note}</p> : null}
      </div>
      {loading ? <LoadingState message={`Loading ${title.toLowerCase()}...`} /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error ? children : null}
    </div>
  );
}

function messageFrom(error: unknown): string {
  return error instanceof ApiError ? error.message : "Unable to connect to the server. Please make sure the backend is running.";
}

function AddFaculty({ departmentId, onCreated }: { departmentId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <RecordForm
      title="Add faculty"
      disabled={!departmentId}
      onSubmit={async () => {
        if (!name.trim() || !email.trim()) {
          return "Name and email are required.";
        }
        await createFaculty({ name: name.trim(), email: email.trim(), departmentId });
        setName("");
        setEmail("");
        onCreated();
        return null;
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Email" value={email} onChange={setEmail} />
    </RecordForm>
  );
}

function AddSubject({ departmentId, onCreated }: { departmentId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isLab, setIsLab] = useState(false);
  return (
    <RecordForm
      title="Add subject"
      disabled={!departmentId}
      onSubmit={async () => {
        if (!name.trim() || !code.trim()) {
          return "Name and code are required.";
        }
        await createSubject({ name: name.trim(), code: code.trim(), departmentId, isLab });
        setName("");
        setCode("");
        setIsLab(false);
        onCreated();
        return null;
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Code" value={code} onChange={setCode} />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isLab} onChange={(event) => setIsLab(event.target.checked)} />
        Lab subject
      </label>
    </RecordForm>
  );
}

function AddDivision({ departmentId, onCreated }: { departmentId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [studentCount, setStudentCount] = useState("");
  return (
    <RecordForm
      title="Add division"
      disabled={!departmentId}
      onSubmit={async () => {
        const count = positiveInteger(studentCount);
        if (!name.trim() || count === null) {
          return "Name is required, and student count must be a positive integer.";
        }
        await createDivision({ name: name.trim(), departmentId, studentCount: count });
        setName("");
        setStudentCount("");
        onCreated();
        return null;
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Students" value={studentCount} onChange={setStudentCount} />
    </RecordForm>
  );
}

function AddClassroom({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [roomType, setRoomType] = useState<Classroom["roomType"]>("CLASSROOM");
  return (
    <RecordForm
      title="Add classroom"
      onSubmit={async () => {
        const seats = positiveInteger(capacity);
        if (!name.trim() || seats === null) {
          return "Name is required, and capacity must be a positive integer.";
        }
        await createClassroom({ name: name.trim(), capacity: seats, roomType });
        setName("");
        setCapacity("");
        setRoomType("CLASSROOM");
        onCreated();
        return null;
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Capacity" value={capacity} onChange={setCapacity} />
      <label className="flex flex-col gap-1 text-sm text-slate-600">
        Type
        <select className={fieldClass} value={roomType} onChange={(event) => setRoomType(event.target.value as Classroom["roomType"])}>
          <option value="CLASSROOM">Classroom</option>
          <option value="LAB">Lab</option>
        </select>
      </label>
    </RecordForm>
  );
}

function AddAssignment({
  subjects,
  divisions,
  faculty,
  onCreated,
}: {
  subjects: Subject[];
  divisions: Division[];
  faculty: Faculty[];
  onCreated: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [periodsPerWeek, setPeriodsPerWeek] = useState("");
  return (
    <RecordForm
      title="Add assignment"
      disabled={subjects.length === 0 || divisions.length === 0 || faculty.length === 0}
      onSubmit={async () => {
        const periods = positiveInteger(periodsPerWeek);
        if (!subjectId || !divisionId || !facultyId || periods === null || periods > 30) {
          return "Choose a subject, division, and faculty member. Periods per week must be an integer from 1 to 30.";
        }
        await createAssignment({ subjectId, divisionId, facultyId, periodsPerWeek: periods });
        setSubjectId("");
        setDivisionId("");
        setFacultyId("");
        setPeriodsPerWeek("");
        onCreated();
        return null;
      }}
    >
      <SelectField label="Subject" value={subjectId} onChange={setSubjectId} options={subjects.map((item) => ({ id: item.id, label: item.name }))} />
      <SelectField label="Division" value={divisionId} onChange={setDivisionId} options={divisions.map((item) => ({ id: item.id, label: item.name }))} />
      <SelectField label="Faculty" value={facultyId} onChange={setFacultyId} options={faculty.map((item) => ({ id: item.id, label: item.name }))} />
      <TextField label="Periods / week" value={periodsPerWeek} onChange={setPeriodsPerWeek} />
    </RecordForm>
  );
}

function RecordForm({
  title,
  disabled,
  onSubmit,
  children,
}: {
  title: string;
  disabled?: boolean;
  onSubmit: () => Promise<string | null>;
  children: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const validation = await onSubmit();
      if (validation) {
        setError(validation);
      } else {
        setNotice("Saved.");
      }
    } catch (caught: unknown) {
      setError(messageFrom(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">{children}</div>
      {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-emerald-800">{notice}</p> : null}
      <button
        type="submit"
        disabled={saving || disabled}
        className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300"
      >
        {saving ? "Saving..." : "Add"}
      </button>
    </form>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      {label}
      <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      {label}
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function positiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value.trim())) {
    return null;
  }
  return Number(value.trim());
}

const fieldClass = "rounded-md border border-slate-300 px-3 py-2 text-slate-900";

function useRowActions(reload: () => void) {
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string, confirmText: string, request: () => Promise<unknown>) {
    if (!window.confirm(confirmText)) {
      return;
    }
    setDeletingId(id);
    setNotice(null);
    setError(null);
    try {
      await request();
      setEditing((current) => (current?.id === id ? null : current));
      setNotice("Deleted.");
      reload();
    } catch (caught: unknown) {
      setError(messageFrom(caught));
    } finally {
      setDeletingId(null);
    }
  }

  return {
    editing,
    notice,
    error,
    deletingId,
    edit: (row: { id: string }) => {
      setEditing(row);
      setNotice(null);
      setError(null);
    },
    cancel: () => setEditing(null),
    saved: () => {
      setEditing(null);
      setError(null);
      setNotice("Updated.");
      reload();
    },
    remove,
  };
}

function ActionNotice({ notice, error }: { notice: string | null; error: string | null }) {
  return (
    <>
      {notice ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
    </>
  );
}

function RowActions({ deleting, onEdit, onDelete }: { deleting: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="flex gap-2 whitespace-nowrap">
      <button type="button" onClick={onEdit} className="text-sm font-medium text-blue-700">
        Edit
      </button>
      <button type="button" onClick={onDelete} disabled={deleting} className="text-sm font-medium text-red-800 disabled:text-red-300">
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </span>
  );
}

function EditFaculty({ faculty, onSaved, onCancel }: { faculty: Faculty; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(faculty.name);
  const [email, setEmail] = useState(faculty.email);
  return (
    <EditForm
      title="Edit faculty"
      onCancel={onCancel}
      onSubmit={async () => {
        if (!name.trim() || !email.trim() || !email.includes("@")) {
          return "Name and a valid email are required.";
        }
        await updateFaculty(faculty.id, { name: name.trim(), email: email.trim() });
        onSaved();
        return null;
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Email" value={email} onChange={setEmail} />
    </EditForm>
  );
}

function EditSubject({ subject, onSaved, onCancel }: { subject: Subject; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code);
  const [isLab, setIsLab] = useState(subject.isLab);
  return (
    <EditForm
      title="Edit subject"
      onCancel={onCancel}
      onSubmit={async () => {
        if (!name.trim() || !code.trim()) {
          return "Name and code are required.";
        }
        await updateSubject(subject.id, { name: name.trim(), code: code.trim(), isLab });
        onSaved();
        return null;
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Code" value={code} onChange={setCode} />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isLab} onChange={(event) => setIsLab(event.target.checked)} />
        Lab subject
      </label>
    </EditForm>
  );
}

function EditDivision({ division, onSaved, onCancel }: { division: Division; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(division.name);
  const [studentCount, setStudentCount] = useState(String(division.studentCount));
  return (
    <EditForm
      title="Edit division"
      onCancel={onCancel}
      onSubmit={async () => {
        const count = positiveInteger(studentCount);
        if (!name.trim() || count === null) {
          return "Name is required, and student count must be a positive integer.";
        }
        await updateDivision(division.id, { name: name.trim(), studentCount: count });
        onSaved();
        return null;
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Students" value={studentCount} onChange={setStudentCount} />
    </EditForm>
  );
}

function EditClassroom({ classroom, onSaved, onCancel }: { classroom: Classroom; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(classroom.name);
  const [capacity, setCapacity] = useState(String(classroom.capacity));
  const [roomType, setRoomType] = useState<Classroom["roomType"]>(classroom.roomType);
  return (
    <EditForm
      title="Edit classroom"
      onCancel={onCancel}
      onSubmit={async () => {
        const seats = positiveInteger(capacity);
        if (!name.trim() || seats === null) {
          return "Name is required, and capacity must be a positive integer.";
        }
        await updateClassroom(classroom.id, { name: name.trim(), capacity: seats, roomType });
        onSaved();
        return null;
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Capacity" value={capacity} onChange={setCapacity} />
      <label className="flex flex-col gap-1 text-sm text-slate-600">
        Type
        <select className={fieldClass} value={roomType} onChange={(event) => setRoomType(event.target.value as Classroom["roomType"])}>
          <option value="CLASSROOM">Classroom</option>
          <option value="LAB">Lab</option>
        </select>
      </label>
    </EditForm>
  );
}

function EditAssignment({
  assignment,
  subjects,
  divisions,
  faculty,
  onSaved,
  onCancel,
}: {
  assignment: Assignment;
  subjects: Subject[];
  divisions: Division[];
  faculty: Faculty[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [subjectId, setSubjectId] = useState(assignment.subject.id);
  const [divisionId, setDivisionId] = useState(assignment.division.id);
  const [facultyId, setFacultyId] = useState(assignment.faculty.id);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(String(assignment.periodsPerWeek));
  return (
    <EditForm
      title="Edit assignment"
      onCancel={onCancel}
      onSubmit={async () => {
        const periods = positiveInteger(periodsPerWeek);
        if (!subjectId || !divisionId || !facultyId || periods === null || periods > 30) {
          return "Choose a subject, division, and faculty member. Periods per week must be an integer from 1 to 30.";
        }
        await updateAssignment(assignment.id, { subjectId, divisionId, facultyId, periodsPerWeek: periods });
        onSaved();
        return null;
      }}
    >
      <SelectField label="Subject" value={subjectId} onChange={setSubjectId} options={subjects.map((item) => ({ id: item.id, label: item.name }))} />
      <SelectField label="Division" value={divisionId} onChange={setDivisionId} options={divisions.map((item) => ({ id: item.id, label: item.name }))} />
      <SelectField label="Faculty" value={facultyId} onChange={setFacultyId} options={faculty.map((item) => ({ id: item.id, label: item.name }))} />
      <TextField label="Periods / week" value={periodsPerWeek} onChange={setPeriodsPerWeek} />
    </EditForm>
  );
}

function EditForm({
  title,
  onSubmit,
  onCancel,
  children,
}: {
  title: string;
  onSubmit: () => Promise<string | null>;
  onCancel: () => void;
  children: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const validation = await onSubmit();
      if (validation) {
        setError(validation);
      }
    } catch (caught: unknown) {
      setError(messageFrom(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">{children}</div>
      {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={saving} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300">
          {saving ? "Saving..." : "Save change"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800">
          Cancel
        </button>
      </div>
    </form>
  );
}
