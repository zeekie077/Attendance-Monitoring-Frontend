import type { Database, Notice, Role } from "../types";

const routes: Record<Role, readonly string[]> = {
  Administrator: [
    "/",
    "/students",
    "/faculty",
    "/teacher-requests",
    "/academics",
    "/schedule",
    "/attendance",
    "/attendance/manual",
    "/reports",
    "/analytics",
    "/rfid",
    "/qr",
    "/devices",
    "/corrections",
    "/notifications",
    "/settings",
  ],
  Faculty: [
    "/",
    "/students",
    "/schedule",
    "/attendance",
    "/attendance/manual",
    "/reports",
    "/analytics",
    "/rfid",
    "/qr",
    "/corrections",
    "/notifications",
  ],
  Student: [
    "/",
    "/my-attendance",
    "/attendance",
    "/schedule",
    "/corrections",
    "/notifications",
  ],
};
export function canAccessRoute(role: Role | null, path: string): boolean {
  return !!role && !!routes[role]?.includes(path);
}

export function canViewNotice(
  db: Database,
  role: Role | null,
  notice: Notice,
  studentId = "",
  facultyId = "",
): boolean {
  if (!role) return false;
  if (role === "Administrator") return true;
  if (role === "Student")
    return (
      notice.studentId === studentId || notice.category === "Upcoming class"
    );
  if (!notice.studentId) return true;
  const student = db.students.find((s) => s.id === notice.studentId);
  return db.classes.some(
    (c) => c.faculty === facultyId && c.section === student?.section,
  );
}
