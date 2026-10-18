import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Avatar, Empty, PageTitle } from "../components/ui";
import { useData } from "../services/store";
import { localDate } from "../data/seed";
import type { ManualStatus } from "../services/attendanceService";

export function ManualAttendance() {
  const { db, role, facultyId, saveManual } = useData();
  const [params] = useSearchParams();
  const classes = db.classes.filter(
    (c) => role === "Administrator" || c.faculty === facultyId,
  );
  const initial =
    classes.find((c) => c.id === params.get("class")) || classes[0];
  const [classId, setClassId] = useState(initial?.id || "");
  const [section, setSection] = useState(initial?.section || "");
  const [date, setDate] = useState(params.get("date") || localDate());
  const [draft, setDraft] = useState<Partial<Record<string, ManualStatus>>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const session = classes.find(
    (c) => c.id === classId && c.section === section,
  );
  const roster = db.students.filter(
    (s) => !s.archived && s.section === session?.section,
  );
  const existing = db.attendance.filter(
    (a) => a.classId === session?.id && a.date === date,
  );
  const statusFor = (id: string) =>
    draft[id] || existing.find((a) => a.studentId === id)?.status || "Present";

  const changeSelection = (change: () => void) => {
    if (
      Object.keys(draft).length &&
      !window.confirm("Discard unsaved attendance changes?")
    )
      return;
    change();
    setDraft({});
    setError("");
    setSaved(false);
  };

  return (
    <>
      <PageTitle
        title="Manual attendance"
        description="Record or edit attendance for an enrolled class. Selecting a class and date loads its saved records."
      >
        <Link className="button" to="/attendance">
          Attendance history
        </Link>
      </PageTitle>
      <section className="panel">
        <div className="report-filters">
          <label>
            Subject / class
            <select
              value={classId}
              onChange={(e) =>
                changeSelection(() => {
                  setClassId(e.target.value);
                  setSection(
                    classes.find((c) => c.id === e.target.value)?.section || "",
                  );
                })
              }
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name} · {c.section} · {c.day} {c.start}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <select
              value={section}
              onChange={(e) =>
                changeSelection(() => {
                  setSection(e.target.value);
                  setClassId(
                    classes.find(
                      (c) =>
                        c.section === e.target.value &&
                        c.code === session?.code,
                    )?.id ||
                      classes.find((c) => c.section === e.target.value)?.id ||
                      "",
                  );
                })
              }
            >
              {[...new Set(classes.map((c) => c.section))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              required
              max={localDate()}
              value={date}
              onChange={(e) => changeSelection(() => setDate(e.target.value))}
            />
          </label>
        </div>
        <div className="panel-heading">
          <div>
            <h2>
              {existing.length ? "Edit attendance record" : "Record attendance"}
            </h2>
            <p>
              {roster.length} enrolled students · {existing.length} saved
              records
            </p>
          </div>
          <button
            type="button"
            className="button"
            disabled={!roster.length}
            onClick={() => {
              setDraft(
                Object.fromEntries(roster.map((s) => [s.id, "Present"])),
              );
              setSaved(false);
            }}
          >
            Mark All Present
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            try {
              // Ligtas na pag-save na hindi mag-iiwan ng undefined properties
              const payload = roster.map((s) => ({
                studentId: s.id,
                status: (statusFor(s.id) || "Present") as ManualStatus,
              }));

              if (typeof saveManual === "function") {
                saveManual(session?.id || "", date, payload);
              }
              setDraft({});
              setSaved(true);
            } catch (err: any) {
              setError(err?.message || "Failed to save attendance records.");
            }
          }}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Attendance status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="person">
                        <Avatar name={s.name} photo={s.photo} />
                        <b>{s.name}</b>
                      </div>
                    </td>
                    <td>{s.id}</td>
                    <td>
                      <select
                        aria-label={`Attendance for ${s.name}`}
                        value={statusFor(s.id)}
                        onChange={(e) => {
                          setDraft({
                            ...draft,
                            [s.id]: e.target.value as ManualStatus,
                          });
                          setSaved(false);
                        }}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                        <option value="Excused">Excused</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!roster.length && (
              <Empty text="No enrolled students in this class. Administrators can assign classes and sections first." />
            )}
          </div>
          <div className="padded">
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {saved && (
              <p role="status">
                Attendance saved successfully. History and metrics are updated.
              </p>
            )}
            <button
              type="submit"
              className="button primary"
              disabled={!roster.length || !date}
            >
              {existing.length ? "Save attendance changes" : "Save attendance"}
            </button>
            <p className="muted">
              Enrollment follows each student's assigned section. Closed RFID/QR
              sessions can still be recorded manually.
            </p>
          </div>
        </form>
      </section>
    </>
  );
}