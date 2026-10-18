import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { seed } from "../data/seed";
import { mockService } from "./mockService";
import type { Database } from "../types";
import {
  authenticate,
  activeAccount,
  hashPassword,
  registerAccount,
  reviewTeacher,
  type Registration,
} from "./authService";
import { saveManualAttendance, createCheckIn, type ManualEntry } from "./attendanceService";

const Context = createContext<ReturnType<typeof useStore> | null>(null);

function useStore() {
  const [db, setDb] = useState(mockService.load);
  const [accountId, setAccountId] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const account = activeAccount(db, accountId);
  const role = account?.role || null;
  const facultyId = account?.role === "Faculty" ? account.profileId : "";
  const currentStudent =
    db.students.find(
      (s) =>
        s.id ===
        (account?.role === "Student" ? account.profileId : db.students[0]?.id),
    ) || db.students[0];

  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    try {
      const id = sessionStorage.getItem("campuspulse-account") || "";
      if (activeAccount(dbRef.current, id)) setAccountId(id);
      else sessionStorage.removeItem("campuspulse-account");
    } catch {
      /* An unavailable session store starts at Login. */
    }
    setAuthLoading(false);
  }, []);

  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const notify = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  };

  useEffect(() => {
    try {
      mockService.save(db);
    } catch {
      notify("Storage unavailable. Changes will last for this visit only.");
    }
  }, [db]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const update = (fn: (data: Database) => Database) => {
    const next = fn(dbRef.current);
    dbRef.current = next;
    setDb(next);
  };

  const register = async (input: Registration) => {
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password, salt);
    update((d) => registerAccount(d, input, { salt, passwordHash }));
  };

  const login = async (identifier: string, password: string) => {
    const user = await authenticate(dbRef.current, identifier, password);
    setAccountId(user.id);
    try {
      sessionStorage.setItem("campuspulse-account", user.id);
    } catch {}
  };

  const logout = () => {
    setAccountId("");
    try {
      sessionStorage.removeItem("campuspulse-account");
    } catch {}
  };

  const approveTeacher = (id: string, status: "Active" | "Rejected") => {
    if (!account) throw Error("Sign in to continue.");
    update((d) => reviewTeacher(d, account.role, id, status));
    notify(
      status === "Active"
        ? "Teacher account approved. Assign classes in Classes & schedules."
        : "Teacher request rejected.",
    );
  };

  const saveManual = async (
    classId: string,
    date: string,
    entries: ManualEntry[],
  ) => {
    if (!account) throw Error("Sign in to continue.");
    try {
      await saveManualAttendance(
        account.role,
        facultyId,
        classId,
        date,
        entries,
      );
      update((d) => {
        const updatedAttendance = [
          ...d.attendance.filter(
            (a) => !(a.classId === classId && a.date === date)
          ),
          ...entries.map((e) => ({
            id: crypto.randomUUID(),
            studentId: e.studentId,
            classId: classId,
            date: date,
            status: e.status,
            method: "Manual" as const,
            device: "Staff",
            time: new Date().toLocaleTimeString(),
            remarks: e.remarks || "Staff entry",
          })),
        ];
        return {
          ...d,
          attendance: updatedAttendance,
        };
      });
      notify("Attendance saved. Dashboards, profiles and reports are updated.");
    } catch (err: any) {
      notify(err?.message || "Failed to save attendance.");
      throw err;
    }
  };

  const scan = async (
    studentId: string,
    classId: string,
    method: string,
    device = "D01",
  ) => {
    if (
      !account ||
      account.role === "Student" ||
      (account.role === "Faculty" &&
        !db.classes.some((c) => c.id === classId && c.faculty === facultyId))
    )
      throw Error("You may only record attendance for your assigned classes.");
    
    try {
      await createCheckIn({
        student_id: studentId,
        class_id: classId,
        method,
        device,
      });
    } catch (err) {
      console.warn("Backend check-in API sync failed, continuing locally.");
    }

    const student = db.students.find((s) => s.id === studentId)!;
    const session = db.classes.find((c) => c.id === classId)!;
    const currentDate = new Date().toISOString().split("T")[0];

    update((d) => ({
      ...d,
      attendance: [
        ...d.attendance.filter(
          (a) =>
            !(
              a.studentId === studentId &&
              a.classId === classId &&
              a.date === currentDate
            ),
        ),
        {
          id: crypto.randomUUID(),
          studentId,
          classId,
          date: currentDate,
          status: "Present" as const,
          method: method as any,
          device,
          time: new Date().toLocaleTimeString(),
        },
      ],
      notices: [
        {
          id: crypto.randomUUID(),
          title: "Attendance registered",
          description: student.name + " checked in to " + session.name + ".",
          category: "Check-in",
          time: new Date().toISOString(),
          read: false,
          studentId,
        },
        ...d.notices,
      ],
    }));
    notify(student.name + " checked in successfully");
  };

  return {
    db,
    update,
    role,
    authLoading,
    account,
    facultyId,
    currentStudent,
    register,
    login,
    logout,
    approveTeacher,
    saveManual,
    toast,
    notify,
    scan,
    reset: () => {
      if (account?.role !== "Administrator")
        throw Error("Only administrators can reset demo data.");
      logout();
      update((d) => ({
        ...seed(),
        accounts: [
          ...seed().accounts.filter((a) => a.role !== "Administrator"),
          ...d.accounts.filter((a) => a.role === "Administrator"),
        ],
      }));
      notify("Demo data has been reset.");
    },
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useStore()}>{children}</Context.Provider>;
}

export function useData() {
  return useContext(Context)!;
}