import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiError, getDepartments } from "../services/api";
import type { Department } from "../types";

const STORAGE_KEY = "smartschedule.departmentId";

interface DepartmentState {
  departments: Department[];
  selectedId: string;
  selected: Department | undefined;
  loading: boolean;
  error: string | null;
  setSelectedId: (id: string) => void;
  reload: () => void;
}

const DepartmentContext = createContext<DepartmentState | null>(null);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedId, setSelectedIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDepartments()
      .then((rows) => {
        if (!active) {
          return;
        }
        setDepartments(rows);
        const stored = localStorage.getItem(STORAGE_KEY);
        const match = rows.find((department) => department.id === stored) ?? rows[0];
        setSelectedIdState(match?.id ?? "");
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setError(caught instanceof ApiError ? caught.message : "Unable to load departments.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [tick]);

  const value = useMemo<DepartmentState>(() => {
    const selected = departments.find((department) => department.id === selectedId);
    return {
      departments,
      selectedId,
      selected,
      loading,
      error,
      setSelectedId: (id: string) => {
        localStorage.setItem(STORAGE_KEY, id);
        setSelectedIdState(id);
      },
      reload: () => setTick((current) => current + 1),
    };
  }, [departments, selectedId, loading, error]);

  return <DepartmentContext.Provider value={value}>{children}</DepartmentContext.Provider>;
}

export function useDepartment(): DepartmentState {
  const value = useContext(DepartmentContext);
  if (!value) {
    throw new Error("useDepartment must be used within DepartmentProvider");
  }
  return value;
}
