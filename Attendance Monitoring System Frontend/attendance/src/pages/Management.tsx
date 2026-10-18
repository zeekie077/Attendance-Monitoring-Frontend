import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Download,
  Printer,
  Sparkles,
  Bell,
  Check,
  Wifi,
  WifiOff,
  RotateCcw,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { canViewNotice } from "../utils/permissions";
import { useData } from "../services/store";
import { reportRange } from "../services/reportService";
import {
  PageTitle,
  Modal,
  Avatar,
  Badge,
  Empty,
  SearchBox,
} from "../components/ui";
import { exportCSV, percentage, risk } from "../utils/attendance";
import { localDate } from "../data/seed";
import type { ClassItem, Faculty, Correction } from "../types";
export function FacultyPage() {
  const { db, update, notify } = useData();
  const [form, setForm] = useState<Partial<Faculty> | null>(null);
  const [search, setSearch] = useState("");
  return (
    <>
      <PageTitle
        title="Faculty directory"
        description="Supporting the people who inspire the next generation."
      >
        <button className="button primary" onClick={() => setForm({})}>
          <Plus size={17} />
          Add faculty
        </button>
      </PageTitle>
      <div className="filter-row">
        <SearchBox value={search} onChange={setSearch} />
      </div>
      <div className="three-columns">
        {db.faculty
          .filter((f) =>
            `${f.name} ${f.department}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((f) => (
            <section className="panel faculty-card" key={f.id}>
              <div className="actions spread">
                <Avatar name={f.name} size="large" />
                <button
                  className="icon-button"
                  aria-label={`Edit ${f.name}`}
                  onClick={() => setForm(f)}
                >
                  <Pencil size={17} />
                </button>
              </div>
              <h2>{f.name}</h2>
              <p>{f.department}</p>
              <small>{f.email}</small>
              <div className="faculty-subjects">
                {db.classes
                  .filter((c) => c.faculty === f.id)
                  .map((c) => (
                    <div key={c.id}>
                      <b>{c.name}</b>
                      <small>
                        {c.day} · {c.start}–{c.end} · {c.section}
                      </small>
                      <Badge>{`${percentage(db.attendance.filter((a) => a.classId === c.id))}% class attendance`}</Badge>
                    </div>
                  ))}
              </div>
            </section>
          ))}
      </div>
      {form && (
        <Modal
          title={form.id ? "Edit faculty profile" : "Add faculty"}
          onClose={() => setForm(null)}
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const fields = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              const f: Faculty = {
                id: form.id || crypto.randomUUID(),
                name: fields.name,
                department: fields.department,
                email: fields.email,
              };
              update((d) => ({
                ...d,
                faculty: form.id
                  ? d.faculty.map((x) => (x.id === f.id ? f : x))
                  : [...d.faculty, f],
              }));
              setForm(null);
              notify("Faculty profile saved.");
            }}
          >
            {["name", "department", "email"].map((k) => (
              <label key={k}>
                {k}
                <input
                  name={k}
                  type={k === "email" ? "email" : "text"}
                  defaultValue={form[k as keyof Faculty]}
                  required
                />
              </label>
            ))}
            <button className="button primary">Save faculty</button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Schedule() {
  const { db, role, update, notify, facultyId, currentStudent } = useData();
  const [view, setView] = useState("Week");
  const [day, setDay] = useState(
    new Date().toLocaleDateString("en-US", { weekday: "long" }),
  );
  const [form, setForm] = useState<Partial<ClassItem> | null>(null);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const classes = db.classes.filter((c) =>
    role === "Student"
      ? c.section === currentStudent.section
      : role === "Faculty"
        ? c.faculty === facultyId
        : true,
  );
  return (
    <>
      <PageTitle
        title="Classes & schedules"
        description="Make room for a productive week."
      >
        {role === "Administrator" && (
          <button className="button primary" onClick={() => setForm({})}>
            <Plus size={17} />
            Add class
          </button>
        )}
      </PageTitle>
      <section className="panel">
        <div className="panel-heading">
          <div className="actions">
            <CalendarDays size={20} />
            <h2>Weekly timetable</h2>
          </div>
          <div className="actions">
            <div className="segmented">
              {["Week", "Day"].map((v) => (
                <button
                  key={v}
                  className={view === v ? "selected" : ""}
                  onClick={() => setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            {view === "Day" && (
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                aria-label="Schedule day"
              >
                {[...days, "Saturday", "Sunday"].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className={`timetable ${view === "Day" ? "day-view" : ""}`}>
          {(view === "Week" ? days : [day]).map((d) => (
            <div className="day-column" key={d}>
              <h3>{d}</h3>
              {classes
                .filter((c) => c.day === d)
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((c) => (
                  <button
                    className="schedule-block"
                    key={c.id}
                    onClick={() => setForm(c)}
                  >
                    <small>
                      {c.start}–{c.end}
                    </small>
                    <b>{c.name}</b>
                    <span>
                      {c.code} · {c.section}
                    </span>
                    <small>{c.room}</small>
                    <small>
                      {db.faculty.find((f) => f.id === c.faculty)?.name}
                    </small>
                    <Badge>
                      {c.active
                        ? "Active"
                        : c.end < new Date().toTimeString().slice(0, 5) &&
                            d ===
                              new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                              })
                          ? "Completed"
                          : "Upcoming"}
                    </Badge>
                  </button>
                ))}
              {!classes.some((c) => c.day === d) && (
                <p className="quiet-day">
                  A little room to breathe.
                  <br />
                  No scheduled classes.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      {form && (
        <Modal
          title={
            role === "Administrator"
              ? form.id
                ? "Edit class"
                : "Add class"
              : "Class details"
          }
          onClose={() => setForm(null)}
        >
          {role === "Administrator" ? (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(
                  new FormData(e.currentTarget),
                ) as Record<string, string>;
                if (f.end <= f.start) {
                  notify("End time must be later than start time.");
                  return;
                }
                if (
                  db.classes.some(
                    (c) =>
                      c.id !== form.id &&
                      c.day === f.day &&
                      c.start < f.end &&
                      c.end > f.start &&
                      (c.room === f.room ||
                        c.faculty === f.faculty ||
                        c.section === f.section),
                  )
                ) {
                  notify(
                    "Schedule conflicts with an existing room, section, or faculty assignment.",
                  );
                  return;
                }
                const item = {
                  ...f,
                  id: form.id || crypto.randomUUID(),
                  active: form.active || false,
                } as unknown as ClassItem;
                update((d) => ({
                  ...d,
                  classes: form.id
                    ? d.classes.map((c) => (c.id === form.id ? item : c))
                    : [...d.classes, item],
                }));
                setForm(null);
                notify("Class schedule saved.");
              }}
            >
              {["name", "code", "room"].map((k) => (
                <label key={k}>
                  {k}
                  <input
                    name={k}
                    required
                    defaultValue={String(form[k as keyof ClassItem] || "")}
                  />
                </label>
              ))}
              <label>
                Section
                <select name="section" defaultValue={form.section}>
                  {db.sections.map((s) => (
                    <option key={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Faculty
                <select name="faculty" defaultValue={form.faculty}>
                  {db.faculty
                    .filter(
                      (f) =>
                        !db.accounts.some(
                          (a) => a.profileId === f.id && a.status !== "Active",
                        ),
                    )
                    .map((f) => (
                      <option value={f.id} key={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Day
                <select name="day" defaultValue={form.day}>
                  {days.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <div className="two-columns">
                {["start", "end"].map((k) => (
                  <label key={k}>
                    {k}
                    <input
                      type="time"
                      name={k}
                      defaultValue={String(
                        form[k as keyof ClassItem] || "08:00",
                      )}
                      required
                    />
                  </label>
                ))}
              </div>
              <button className="button primary">Save class</button>
            </form>
          ) : (
            <div className="form-grid">
              <h3>{form.name}</h3>
              <p>
                {form.day} · {form.start}–{form.end}
              </p>
              <p>
                {form.room} · {form.section}
              </p>
              <p>{db.faculty.find((f) => f.id === form.faculty)?.name}</p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
export function Reports() {
  const { db, role, notify, facultyId } = useData();
  const [period, setPeriod] = useState("Monthly");
  const [anchor, setAnchor] = useState(localDate());
  const [start, setStart] = useState(
    () => reportRange("Monthly", localDate()).start,
  );
  const [end, setEnd] = useState(() => reportRange("Monthly", localDate()).end);
  const [scope, setScope] = useState("All attendance");
  const [section, setSection] = useState("all");
  const [classId, setClassId] = useState("all");
  const [student, setStudent] = useState("all");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const classes = db.classes.filter(
    (c) =>
      (role !== "Faculty" || c.faculty === facultyId) &&
      (department === "all" ||
        db.programs.some(
          (p) =>
            p.department === department &&
            db.sections.some(
              (s) => s.programId === p.id && s.name === c.section,
            ),
        )),
  );
  const rows = db.attendance.filter(
    (a) =>
      !!start &&
      !!end &&
      start <= end &&
      (scope !== "Individual student" || student !== "all") &&
      (scope !== "Class / section" || section !== "all" || classId !== "all") &&
      a.date >= start &&
      a.date <= end &&
      classes.some((c) => c.id === a.classId) &&
      (section === "all" ||
        classes.find((c) => c.id === a.classId)?.section === section) &&
      (classId === "all" || classId === a.classId) &&
      (student === "all" || student === a.studentId) &&
      (status === "all" || a.status === status),
  );
  const summary = classes
    .filter(
      (c) =>
        (classId === "all" || c.id === classId) &&
        (section === "all" || c.section === section),
    )
    .map((c) => ({
      name: `${c.code} · ${c.section}`,
      id: c.id,
      Excused: rows.filter((a) => a.classId === c.id && a.status === "Excused")
        .length,
      Present: rows.filter((a) => a.classId === c.id && a.status === "Present")
        .length,
      Late: rows.filter((a) => a.classId === c.id && a.status === "Late")
        .length,
      Absent: rows.filter((a) => a.classId === c.id && a.status === "Absent")
        .length,
    }));
  return (
    <>
      <PageTitle
        title="Attendance reports"
        description="Turn everyday attendance into a clear, shareable picture."
      >
        <button className="button" onClick={() => window.print()}>
          <Printer size={16} />
          Print report
        </button>
        <button
          className="button primary"
          onClick={() => {
            if (!rows.length) {
              notify("No records match this report.");
              return;
            }
            exportCSV(
              "campuspulse-report.csv",
              rows.map((a) => ({
                ...a,
                student: db.students.find((s) => s.id === a.studentId)?.name,
                subject: db.classes.find((c) => c.id === a.classId)?.name,
                section: db.classes.find((c) => c.id === a.classId)?.section,
              })),
            );
            notify("Report exported.");
          }}
        >
          <Download size={16} />
          Export CSV
        </button>
      </PageTitle>
      <section className="panel report-filters">
        <label>
          Report scope
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setStudent("all");
              setClassId("all");
              setSection("all");
            }}
          >
            {["All attendance", "Individual student", "Class / section"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Section
          <select
            value={section}
            onChange={(e) => {
              setSection(e.target.value);
              setClassId("all");
              setStudent("all");
            }}
          >
            <option value="all">All sections</option>
            {[...new Set(classes.map((c) => c.section))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Department
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setClassId("all");
              setSection("all");
              setStudent("all");
            }}
          >
            <option value="all">All departments</option>
            {[...new Set(db.programs.map((p) => p.department))].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Report period
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              if (e.target.value !== "Custom") {
                const range = reportRange(e.target.value, anchor);
                setStart(range.start);
                setEnd(range.end);
              }
            }}
          >
            {["Daily", "Weekly", "Monthly", "Custom"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Report date
          <input
            type="date"
            value={anchor}
            disabled={period === "Custom"}
            onChange={(e) => {
              if (!e.target.value) return;
              setAnchor(e.target.value);
              const range = reportRange(period, e.target.value);
              setStart(range.start);
              setEnd(range.end);
            }}
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={start}
            max={end}
            onChange={(e) => {
              setStart(e.target.value);
              setPeriod("Custom");
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={end}
            min={start}
            onChange={(e) => {
              setEnd(e.target.value);
              setPeriod("Custom");
            }}
          />
        </label>
        <label>
          Class / section
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setStudent("all");
            }}
          >
            <option value="all">All classes</option>
            {classes
              .filter((c) => section === "all" || c.section === section)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.section}
                </option>
              ))}
          </select>
        </label>
        <label>
          Student
          <select value={student} onChange={(e) => setStudent(e.target.value)}>
            <option value="all">All students</option>
            {db.students
              .filter((s) =>
                classes.some(
                  (c) =>
                    c.section === s.section &&
                    (classId === "all" || c.id === classId) &&
                    (section === "all" || c.section === section),
                ),
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {["Present", "Late", "Absent", "Excused"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </section>
      {(!start || !end || start > end) && (
        <p className="form-error" role="alert">
          Choose a valid date range.
        </p>
      )}
      {scope === "Individual student" && student === "all" && (
        <p className="notice-banner">
          Select a student to generate an individual attendance report.
        </p>
      )}
      {scope === "Class / section" &&
        classId === "all" &&
        section === "all" && (
          <p className="notice-banner">
            Select a class or section to generate its attendance report.
          </p>
        )}
      <div className="stats-grid">
        {[
          ["Recorded sessions", rows.length],
          ["Attendance rate", `${percentage(rows)}%`],
          ["Late arrivals", rows.filter((a) => a.status === "Late").length],
          ["Absences", rows.filter((a) => a.status === "Absent").length],
        ].map(([l, v]) => (
          <div className="stat-card" key={l}>
            <p>{l}</p>
            <h1>{v}</h1>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            {period} attendance ·{" "}
            {student !== "all"
              ? db.students.find((s) => s.id === student)?.name
              : scope}
          </h2>
          <span>
            {start} — {end}
          </span>
        </div>
        <div className="report-chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Present" fill="#8271df" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Late" fill="#edb766" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Absent" fill="#e7a0a8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Excused" fill="#729dc6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Excused</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.Present}</td>
                  <td>{s.Late}</td>
                  <td>{s.Absent}</td>
                  <td>{s.Excused}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty />}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Report attendance records</h2>
          <span>
            {rows.length} records · {percentage(rows)}% attendance
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student / ID</th>
                <th>Date</th>
                <th>Subject</th>
                <th>Section</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((a) => (
                  <tr key={a.id}>
                    <td>
                      {db.students.find((s) => s.id === a.studentId)?.name}
                      <small>{a.studentId}</small>
                    </td>
                    <td>{a.date}</td>
                    <td>{classes.find((c) => c.id === a.classId)?.name}</td>
                    <td>{classes.find((c) => c.id === a.classId)?.section}</td>
                    <td>
                      <Badge>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!rows.length && (
            <Empty text="No attendance records match this report." />
          )}
        </div>
      </section>
    </>
  );
}
export function Insights() {
  const { db, role, facultyId } = useData();
  const students = db.students.filter(
    (s) =>
      !s.archived &&
      (role !== "Faculty" ||
        db.classes.some(
          (c) => c.faculty === facultyId && c.section === s.section,
        )),
  );
  const values = students.map((s) => {
    const rows = db.attendance.filter((a) => a.studentId === s.id);
    const rate = percentage(rows);
    const late = rows.filter((a) => a.status === "Late").length;
    const split = Math.floor(rows.length / 2);
    const change =
      percentage(rows.slice(split)) - percentage(rows.slice(0, split));
    return { ...s, rate, late, change };
  });
  return (
    <>
      <PageTitle
        title="Smart attendance insights"
        description="Small signals. Meaningful opportunities to support your students."
      >
        <span className="subtle-badge">
          <Sparkles size={14} />
          Rule-based insights
        </span>
      </PageTitle>
      <div className="notice-banner">
        Calculated from attendance records and your configured thresholds. No AI
        service or predictive model is used.
      </div>
      <div className="three-columns">
        {[
          {
            title: "Attendance needs attention",
            rows: values.filter((s) => s.rate < db.thresholds.good),
            description: `Students below the ${db.thresholds.good}% good-standing threshold.`,
            kind: "rate",
          },
          {
            title: "Repeated late arrivals",
            rows: values.filter((s) => s.late >= 3),
            description: "Three or more late arrivals in recorded history.",
            kind: "late",
          },
          {
            title: "Declining attendance",
            rows: values.filter((s) => s.change < 0),
            description: "Recent half of records compared with earlier half.",
            kind: "change",
          },
        ].map((group) => (
          <section className="panel insight-group" key={group.title}>
            <Sparkles size={22} />
            <h2>{group.title}</h2>
            <p>{group.description}</p>
            {group.rows.map((s) => (
              <Link
                className="insight-student"
                to={`/students/${s.id}`}
                key={s.id}
              >
                <Avatar name={s.name} />
                <div>
                  <b>{s.name}</b>
                  <small>
                    {group.kind === "rate"
                      ? risk(s.rate, db.thresholds)
                      : group.kind === "late"
                        ? `${s.late} late arrivals`
                        : `${s.change} percentage points`}
                  </small>
                  <div className="progress">
                    <span style={{ width: `${s.rate}%` }} />
                  </div>
                </div>
                <b>{s.rate}%</b>
              </Link>
            ))}
            {!group.rows.length && <Empty text="Everyone is on track here." />}
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Most frequently missed classes</h2>
        </div>
        {db.classes
          .filter((c) => role !== "Faculty" || c.faculty === facultyId)
          .map((c) => ({
            ...c,
            absent: db.attendance.filter(
              (a) => a.classId === c.id && a.status === "Absent",
            ).length,
          }))
          .sort((a, b) => b.absent - a.absent)
          .map((c) => (
            <div className="list-row" key={c.id}>
              <b>{c.name}</b>
              <span>{c.section}</span>
              <Badge>{`${c.absent} absences`}</Badge>
            </div>
          ))}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Attendance across weekdays</h2>
        </div>
        <div className="department-list">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
            (day) => {
              const records = db.attendance.filter(
                (a) =>
                  new Date(a.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                  }) === day &&
                  (role !== "Faculty" ||
                    db.classes.some(
                      (c) => c.id === a.classId && c.faculty === facultyId,
                    )),
              );
              return (
                <div key={day}>
                  <b>{day}</b>
                  <div className="progress">
                    <span style={{ width: `${percentage(records)}%` }} />
                  </div>
                  <strong>{percentage(records)}%</strong>
                </div>
              );
            },
          )}
        </div>
      </section>
    </>
  );
}
export function Notifications() {
  const { db, update, role, facultyId, currentStudent } = useData();
  const [category, setCategory] = useState("All notifications");
  const notices = db.notices.filter(
    (n) =>
      canViewNotice(db, role, n, currentStudent.id, facultyId) &&
      (category === "All notifications" || n.category === category),
  );
  return (
    <>
      <PageTitle
        title="Notification center"
        description="Stay in the loop with the things that matter."
      >
        <button
          className="button"
          onClick={() =>
            update((d) => ({
              ...d,
              notices: d.notices.map((n) =>
                notices.some((x) => x.id === n.id) ? { ...n, read: true } : n,
              ),
            }))
          }
        >
          <Check size={16} />
          Mark all as read
        </button>
      </PageTitle>
      <section className="panel">
        <div className="panel-heading">
          <h2>{notices.filter((n) => !n.read).length} unread notifications</h2>
          <select
            aria-label="Notification category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>All notifications</option>
            {[...new Set(db.notices.map((n) => n.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {notices.map((n) => (
          <button
            key={n.id}
            className={`notification-row ${n.read ? "" : "unread"}`}
            onClick={() =>
              update((d) => ({
                ...d,
                notices: d.notices.map((x) =>
                  x.id === n.id ? { ...x, read: true } : x,
                ),
              }))
            }
          >
            <span className="notification-icon">
              <Bell size={20} />
            </span>
            <div>
              <b>{n.title}</b>
              <p>{n.description}</p>
              <small>
                {n.category} · {new Date(n.time).toLocaleString()}
              </small>
            </div>
            {!n.read && <i className="unread-dot" />}
          </button>
        ))}
        {!notices.length && <Empty />}
      </section>
    </>
  );
}
export function Corrections() {
  const { db, role, update, notify, facultyId, currentStudent } = useData();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<{
    id: string;
    status: "Approved" | "Rejected";
  } | null>(null);
  const [attachment, setAttachment] = useState("");
  const classes = db.classes.filter((c) =>
    role === "Student"
      ? c.section === currentStudent.section
      : role === "Faculty"
        ? c.faculty === facultyId
        : true,
  );
  const rows = db.corrections.filter(
    (c) =>
      (role !== "Student" || c.studentId === currentStudent.id) &&
      classes.some((x) => x.id === c.classId),
  );
  const decide = () => {
    if (!review) return;
    const request = db.corrections.find((c) => c.id === review.id)!;
    update((d) => ({
      ...d,
      corrections: d.corrections.map((c) =>
        c.id === review.id ? { ...c, status: review.status } : c,
      ),
      attendance:
        review.status === "Approved"
          ? [
              ...d.attendance.filter(
                (a) =>
                  !(
                    a.studentId === request.studentId &&
                    a.classId === request.classId &&
                    a.date === request.date
                  ),
              ),
              {
                id: crypto.randomUUID(),
                studentId: request.studentId,
                classId: request.classId,
                date: request.date,
                time: "00:00:00",
                status: "Excused",
                method: "Correction",
                device: "Reviewed",
              },
            ]
          : d.attendance,
      notices: [
        {
          id: crypto.randomUUID(),
          title: `Correction ${review.status.toLowerCase()}`,
          description: request.explanation,
          category: "Correction",
          time: new Date().toISOString(),
          read: false,
          studentId: request.studentId,
        },
        ...d.notices,
      ],
    }));
    setReview(null);
    notify("Request reviewed and attendance updated.");
  };
  return (
    <>
      <PageTitle
        title="Attendance corrections"
        description="Because every attendance record deserves to be accurate."
      >
        <button className="button primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          New request
        </button>
      </PageTitle>
      <section className="panel">
        {rows.map((c) => (
          <div className="correction-row" key={c.id}>
            <div className="person">
              <Avatar
                name={
                  db.students.find((s) => s.id === c.studentId)?.name ||
                  "Student"
                }
              />
              <div>
                <b>{db.students.find((s) => s.id === c.studentId)?.name}</b>
                <small>
                  {db.classes.find((x) => x.id === c.classId)?.name} · {c.date}
                </small>
              </div>
            </div>
            <p>{c.explanation}</p>
            {c.attachment && (
              <small>
                Supporting document: {c.attachment} (demo filename only)
              </small>
            )}
            <div className="actions spread">
              <Badge>{c.status}</Badge>
              {role !== "Student" && c.status === "Pending" && (
                <div className="actions">
                  <button
                    className="button"
                    onClick={() => setReview({ id: c.id, status: "Rejected" })}
                  >
                    Reject
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setReview({ id: c.id, status: "Approved" })}
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!rows.length && <Empty text="No correction requests yet." />}
      </section>
      {open && (
        <Modal
          title="Submit a correction request"
          onClose={() => setOpen(false)}
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              const studentId =
                role === "Student" ? currentStudent.id : f.student;
              const selected = db.students.find((s) => s.id === studentId);
              if (
                selected?.section !==
                db.classes.find((c) => c.id === f.classId)?.section
              ) {
                notify("Student is not enrolled in that section.");
                return;
              }
              if (
                db.corrections.some(
                  (c) =>
                    c.studentId === studentId &&
                    c.classId === f.classId &&
                    c.date === f.date &&
                    c.status === "Pending",
                )
              ) {
                notify("A request is already pending for this class and date.");
                return;
              }
              const c: Correction = {
                id: crypto.randomUUID(),
                studentId,
                classId: f.classId,
                date: f.date,
                explanation: f.explanation,
                attachment,
                status: "Pending",
              };
              update((d) => ({ ...d, corrections: [c, ...d.corrections] }));
              setOpen(false);
              setAttachment("");
              notify("Correction request submitted.");
            }}
          >
            {role !== "Student" && (
              <label>
                Student
                <select name="student">
                  {db.students
                    .filter((s) => !s.archived)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label>
              Subject
              <select name="classId">
                {classes.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Attendance date
              <input
                name="date"
                type="date"
                required
                max={localDate()}
                defaultValue={localDate()}
              />
            </label>
            <label>
              Explanation
              <textarea
                name="explanation"
                minLength={15}
                required
                placeholder="Tell us what happened (at least 15 characters)."
              />
            </label>
            <label>
              Supporting document (optional)
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setAttachment(e.target.files?.[0]?.name || "")}
              />
              <small>Only the filename is stored in this demo.</small>
            </label>
            <button className="button primary">Submit request</button>
          </form>
        </Modal>
      )}
      {review && (
        <Modal
          title={`${review.status === "Approved" ? "Approve" : "Reject"} this correction?`}
          onClose={() => setReview(null)}
        >
          <p>
            {review.status === "Approved"
              ? "Approval changes the selected attendance record to Excused and notifies the student."
              : "The request will be rejected and the attendance record will remain unchanged."}
          </p>
          <button className="button primary" onClick={decide}>
            Confirm decision
          </button>
        </Modal>
      )}
    </>
  );
}
export function Devices() {
  const { db, update, notify } = useData();
  return (
    <>
      <PageTitle
        title="Device monitoring"
        description="A clear view of the terminals connecting your campus."
      >
        <Badge>Simulated devices</Badge>
      </PageTitle>
      <div className="three-columns">
        {db.devices.map((d) => {
          const logs = db.attendance.filter((a) => a.device === d.id);
          return (
            <section className="panel device-card" key={d.id}>
              <div className="actions spread">
                <span className="stat-icon purple">
                  {d.online ? <Wifi size={25} /> : <WifiOff size={25} />}
                </span>
                <Badge>{d.online ? "Online" : "Offline"}</Badge>
              </div>
              <h2>{d.name}</h2>
              <p>{d.room}</p>
              <div className="device-metric">
                <span>Device health</span>
                <b>{d.health}%</b>
              </div>
              <div className="progress">
                <span style={{ width: `${d.health}%` }} />
              </div>
              <div className="device-metric">
                <span>Total scans</span>
                <b>{logs.length}</b>
              </div>
              <small>
                Last activity:{" "}
                {logs.length
                  ? `${logs.at(-1)?.date} ${logs.at(-1)?.time}`
                  : "No scans yet"}
              </small>
              <button
                className="button"
                onClick={() => {
                  update((data) => ({
                    ...data,
                    devices: data.devices.map((x) =>
                      x.id === d.id ? { ...x, online: !x.online } : x,
                    ),
                  }));
                  notify(
                    `Device ${d.online ? "disconnected" : "connected"} in simulation.`,
                  );
                }}
              >
                {d.online ? "Simulate disconnect" : "Reconnect device"}
              </button>
            </section>
          );
        })}
      </div>
    </>
  );
}
export function SettingsPage() {
  const { db, update, notify, reset } = useData();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageTitle
        title="Workspace settings"
        description="Make CampusPulse work for your campus."
      />
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Attendance policy</h2>
            <p>Risk categories use these minimum attendance percentages.</p>
          </div>
        </div>
        <form
          className="form-grid padded"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const good = Number(f.get("good")),
              attention = Number(f.get("attention")),
              risk = Number(f.get("risk"));
            if (!(good > attention && attention > risk)) {
              notify(
                "Thresholds must descend: Good standing > Needs attention > At risk.",
              );
              return;
            }
            update((d) => ({ ...d, thresholds: { good, attention, risk } }));
            notify("Attendance policy updated.");
          }}
        >
          {[
            ["good", "Good standing"],
            ["attention", "Needs attention"],
            ["risk", "At risk"],
          ].map(([key, label]) => (
            <label key={key}>
              {label} (%)
              <input
                type="number"
                name={key}
                min="1"
                max="100"
                defaultValue={db.thresholds[key as keyof typeof db.thresholds]}
                required
              />
            </label>
          ))}
          <p className="muted">
            Attendance below the At risk threshold is Critical Attendance.
            Present, Late, and Excused count toward attendance percentage.
          </p>
          <button className="button primary">Save attendance policy</button>
        </form>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Demo workspace</h2>
            <p>
              Restore the original students, schedules, devices, and attendance
              records.
            </p>
          </div>
          <button className="button danger" onClick={() => setConfirm(true)}>
            <RotateCcw size={16} />
            Reset demo data
          </button>
        </div>
      </section>
      {confirm && (
        <Modal
          title="Reset your demo workspace?"
          onClose={() => setConfirm(false)}
        >
          <p>
            This removes your local changes and restores the original sample
            data.
          </p>
          <button
            className="button danger"
            onClick={() => {
              reset();
              setConfirm(false);
            }}
          >
            Reset all demo data
          </button>
        </Modal>
      )}
    </>
  );
}
