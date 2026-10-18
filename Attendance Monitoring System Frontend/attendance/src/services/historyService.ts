import type { Attendance, ClassItem, Database } from "../types";
export interface HistoryFilters {
  search: string;
  status: string;
  classId: string;
  section: string;
  date: string;
  from: string;
  to: string;
}
export function filterHistory(
  db: Database,
  classes: ClassItem[],
  filters: HistoryFilters,
): Attendance[] {
  const { search, status, classId, section, date, from, to } = filters;
  if (from && to && from > to) return [];
  return db.attendance
    .filter((a) => {
      const session = classes.find((c) => c.id === a.classId);
      return (
        !!session &&
        (classId === "All classes" || a.classId === classId) &&
        (status === "All statuses" || a.status === status) &&
        (!section || session.section === section) &&
        (!date || a.date === date) &&
        (!from || a.date >= from) &&
        (!to || a.date <= to) &&
        `${db.students.find((s) => s.id === a.studentId)?.name || ""} ${a.studentId} ${a.date}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      );
    })
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}
