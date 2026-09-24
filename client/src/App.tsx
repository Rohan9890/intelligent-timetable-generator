import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { DepartmentProvider } from "./hooks/DepartmentContext";
import { HistoryPage } from "./pages/HistoryPage";
import { OverviewPage } from "./pages/OverviewPage";
import { AssignmentsPage, ClassroomsPage, DivisionsPage, FacultyPage, SubjectsPage } from "./pages/SetupPages";
import { TimetablePage } from "./pages/TimetablePage";

export default function App() {
  return (
    <DepartmentProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="faculty" element={<FacultyPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="divisions" element={<DivisionsPage />} />
            <Route path="classrooms" element={<ClassroomsPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DepartmentProvider>
  );
}
