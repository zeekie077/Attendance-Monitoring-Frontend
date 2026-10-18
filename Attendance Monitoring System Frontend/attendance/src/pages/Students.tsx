import { useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link,
  Navigate,
} from "react-router-dom";
import {
  Plus,
  Download,
  Pencil,
  Archive,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useData } from "../services/store";
import {
  Avatar,
  Badge,
  Empty,
  Modal,
  PageTitle,
  SearchBox,
} from "../components/ui";
import { percentage, risk, exportCSV } from "../utils/attendance";
import { localDate } from "../data/seed";
import type { Student } from "../types";
export function Students() {
  const { db, update, notify, role, facultyId } = useData();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const [filter, setFilter] = useState("All programs");
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<Partial<Student> | null>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const navigate = useNavigate();
  const programs = db.programs.map((p) => p.name);
  const rows = db.students
    .filter(
      (s) =>
        s.archived === archived &&
        (role !== "Faculty" ||
          db.classes.some(
            (c) => c.faculty === facultyId && c.section === s.section,
          )) &&
        `${s.name} ${s.id} ${s.rfid}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (filter === "All programs" || s.course === filter),
    )
    .sort((a, b) =>
      sort ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name),
    );
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const current = Math.min(page, pages);
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    if (data.name.trim().length < 3) {
      notify("Enter a full name of at least 3 characters.");
      return;
    }
    if (db.students.some((s) => s.id !== form?.id && s.rfid === data.rfid)) {
      notify("This RFID card is already assigned.");
      return;
    }
    const section = db.sections.find((s) => s.name === data.section);
    if (
      !section ||
      db.programs.find((p) => p.id === section.programId)?.name !==
        data.course ||
      section.year !== Number(data.year)
    ) {
      notify(
        "Choose a section that matches the selected program and year level.",
      );
      return;
    }
    const item: Student = {
      id: form?.id || `2026-${String(Math.max(0, ...db.students.filter(s => s.id.startsWith('2026-')).map(s => Number(s.id.split('-')[1]) || 0)) + 1).padStart(5, '0')}`,
      name: data.name.trim(),
      course: data.course,
      section: data.section,
      year: Number(data.year),
      rfid: data.rfid,
      archived: form?.archived || false,
      photo: photo || form?.photo,
    };
    update((d) => ({
      ...d,
      students: form?.id
        ? d.students.map((s) => (s.id === form.id ? item : s))
        : [...d.students, item],
    }));
    setForm(null);
    setPhoto(undefined);
    notify("Student information saved.");
  };
  return (
    <>
      <PageTitle
        title="Student directory"
        description="The people at the heart of your campus."
      >
        <button
          className="button"
          onClick={() =>
            exportCSV(
              "students.csv",
              rows.map(({ photo, ...s }) => ({
                ...s,
                attendance: percentage(
                  db.attendance.filter((a) => a.studentId === s.id),
                ),
              })),
            )
          }
        >
          <Download size={16} />
          Export
        </button>
        {role === "Administrator" && (
          <button
            className="button primary"
            onClick={() => {
              setPhoto(undefined);
              setForm({
                course: programs[0],
                section: db.sections[0]?.name,
                year: db.sections[0]?.year || 1,
              });
            }}
          >
            <Plus size={17} />
            Add student
          </button>
        )}
      </PageTitle>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            All students <span className="subtle-badge">{rows.length}</span>
          </h2>
          <div className="actions">
            <button
              className={`button ${archived ? "primary" : ""}`}
              onClick={() => {
                setArchived(!archived);
                setSelected([]);
              }}
            >
              {" "}
              {archived ? "Show active" : "View archived"}
            </button>
            {selected.length > 0 && role === "Administrator" && (
              <button
                className="button danger"
                onClick={() => setConfirm(selected)}
              >
                Archive {selected.length}
              </button>
            )}
          </div>
        </div>
        <div className="filter-row">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search name, student ID, or RFID…"
          />
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter program"
          >
            <option>All programs</option>
            {programs.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all filtered students"
                    checked={
                      rows.length > 0 &&
                      rows.every((s) => selected.includes(s.id))
                    }
                    onChange={(e) =>
                      setSelected(e.target.checked ? rows.map((s) => s.id) : [])
                    }
                  />
                </th>
                <th>
                  <button
                    className="plain-button"
                    onClick={() => setSort(!sort)}
                  >
                    Student ↕
                  </button>
                </th>
                <th>Program / section</th>
                <th>RFID card</th>
                <th>Attendance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice((current - 1) * 8, current * 8).map((s) => {
                const value = percentage(
                  db.attendance.filter((a) => a.studentId === s.id),
                );
                return (
                  <tr key={s.id}>
                    <td>
                      <input
                        aria-label={`Select ${s.name}`}
                        type="checkbox"
                        checked={selected.includes(s.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, s.id]
                              : selected.filter((id) => id !== s.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="person plain-button"
                        onClick={() => navigate(`/students/${s.id}`)}
                      >
                        <Avatar name={s.name} photo={s.photo} />
                        <div>
                          <b>{s.name}</b>
                          <small>{s.id}</small>
                        </div>
                      </button>
                    </td>
                    <td>
                      <b>{s.course}</b>
                      <small>
                        {s.section} · Year {s.year}
                      </small>
                    </td>
                    <td>
                      <code>{s.rfid}</code>
                    </td>
                    <td>
                      <b>{value}%</b>
                      <small className={value < 80 ? "text-red" : ""}>
                        {risk(value, db.thresholds)}
                      </small>
                    </td>
                    <td>
                      <Badge>{s.archived ? "Archived" : "Active"}</Badge>
                    </td>
                    <td>
                      {role === "Administrator" && (
                        <div className="actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${s.name}`}
                            onClick={() => {
                              setPhoto(undefined);
                              setForm(s);
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          {!s.archived && (
                            <button
                              className="icon-button"
                              aria-label={`Archive ${s.name}`}
                              onClick={() => setConfirm([s.id])}
                            >
                              <Archive size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty />}
        </div>
        <div className="pagination">
          <span>
            Showing {rows.length ? (current - 1) * 8 + 1 : 0}–
            {Math.min(current * 8, rows.length)} of {rows.length} students
          </span>
          <div className="actions">
            <button
              className="button"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            <span>
              {current} / {pages}
            </span>
            <button
              className="button"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      {form && (
        <Modal
          title={form.id ? "Edit student & RFID" : "Add student"}
          onClose={() => setForm(null)}
        >
          <form className="form-grid" onSubmit={save}>
            <label>
              Profile photo (optional)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    file.size > 1000000 ||
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    )
                  ) {
                    notify("Choose a PNG, JPEG, or WebP photo under 1 MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setPhoto(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <label>
              Full name
              <input
                name="name"
                defaultValue={form.name}
                required
                minLength={3}
              />
            </label>
            <label>
              Program
              <select
                name="course"
                value={form.course || programs[0]}
                onChange={(e) => {
                  const program = db.programs.find(
                    (p) => p.name === e.target.value,
                  );
                  const section = db.sections.find(
                    (s) => s.programId === program?.id,
                  );
                  setForm({
                    ...form,
                    course: e.target.value,
                    section: section?.name || "",
                    year: section?.year || 1,
                  });
                }}
              >
                {programs.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Section
              <select
                name="section"
                required
                value={form.section || ""}
                onChange={(e) => {
                  const section = db.sections.find(
                    (s) => s.name === e.target.value,
                  );
                  setForm({
                    ...form,
                    section: e.target.value,
                    year: section?.year || 1,
                  });
                }}
              >
                <option value="">Choose section</option>
                {db.sections
                  .filter(
                    (s) =>
                      db.programs.find((p) => p.id === s.programId)?.name ===
                      form.course,
                  )
                  .map((s) => (
                    <option key={s.id}>{s.name}</option>
                  ))}
              </select>
            </label>
            <label>
              Year level
              <input
                name="year"
                type="number"
                min="1"
                max="5"
                value={form.year || 1}
                readOnly
                required
              />
            </label>
            <label>
              RFID card number
              <input
                name="rfid"
                defaultValue={form.rfid}
                required
                pattern="RFID-[0-9]+"
                placeholder="RFID-1025"
              />
            </label>
            <button className="button primary" type="submit">
              Save student
            </button>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Archive selected students?"
          onClose={() => setConfirm(null)}
        >
          <p>
            Their attendance history will be preserved. Archived cards cannot
            check in.
          </p>
          <button
            className="button danger"
            onClick={() => {
              update((d) => ({
                ...d,
                students: d.students.map((s) =>
                  confirm.includes(s.id) ? { ...s, archived: true } : s,
                ),
              }));
              setConfirm(null);
              setSelected([]);
              notify("Students archived.");
            }}
          >
            Confirm archive
          </button>
        </Modal>
      )}
    </>
  );
}
export function AttendanceCalendar({ studentId }: { studentId: string }) {
  const { db } = useData();
  const [month, setMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState(localDate());
  const records = db.attendance.filter((a) => a.studentId === studentId);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7;
  return (
    <section className="panel calendar-panel">
      <div className="panel-heading">
        <div>
          <h2>Attendance calendar</h2>
          <p>Select a day to explore your attendance.</p>
        </div>
        <div className="actions">
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={18} />
          </button>
          <b>
            {month.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </b>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="month-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <b key={d}>{d}</b>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = localDate(
            new Date(month.getFullYear(), month.getMonth(), i + 1),
          );
          const rows = records.filter((a) => a.date === date);
          return (
            <button
              className={`${selected === date ? "chosen" : ""} ${rows[0]?.status.toLowerCase() || ""}`}
              key={i}
              onClick={() => setSelected(date)}
            >
              {i + 1}
              {rows.length > 0 && <i />}
            </button>
          );
        })}
      </div>
      <div className="date-detail">
        <b>{selected}</b>
        {records
          .filter((a) => a.date === selected)
          .map((a) => (
            <div key={a.id}>
              {db.classes.find((c) => c.id === a.classId)?.name}{" "}
              <Badge>{a.status}</Badge> {a.time}
            </div>
          ))}
        {!records.some((a) => a.date === selected) && (
          <span>No class attendance recorded.</span>
        )}
      </div>
      <div className="heatmap-title">
        <b>Last 84 days</b>
        <span>
          <Badge>Present</Badge>
          <Badge>Late</Badge>
          <Badge>Absent</Badge>
        </span>
      </div>
      <div className="heatmap">
        {Array.from({ length: 84 }, (_, i) => {
          const day = new Date();
          day.setDate(day.getDate() - 83 + i);
          const date = localDate(day);
          const row = records.find((a) => a.date === date);
          return (
            <button
              key={date}
              aria-label={`${date}: ${row?.status || "No records"}`}
              title={`${date}: ${row?.status || "No records"}`}
              className={row?.status.toLowerCase()}
              onClick={() => {
                setSelected(date);
                setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
export function StudentProfile() {
  const { id: requestedId } = useParams();
  const { db, role, facultyId, currentStudent } = useData();
  const id = requestedId || (role === 'Student' ? currentStudent.id : '');
  if (role === 'Student' && id !== currentStudent.id) return <Navigate to="/" replace />;
  const s = db.students.find((s) => s.id === id);
  if (!s || (role === "Faculty" && !db.classes.some(c => c.faculty === facultyId && c.section === s.section))) return <Empty text="Student not found in your assigned classes." />;
  const records = db.attendance.filter((a) => a.studentId === id);
  return (
    <>
      <Link className="text-link" to={role === 'Student' ? '/' : '/students'}>
        <ArrowLeft size={16} />
        {role === 'Student' ? 'Back to dashboard' : 'Back to directory'}
      </Link>
      <PageTitle
        title={s.name}
        description={`${s.id} · ${s.course} · ${s.section}`}
      >
        <Avatar name={s.name} size="large" photo={s.photo} />
      </PageTitle>
      <div className="stats-grid">
        {[
          ["Attendance", `${percentage(records)}%`],
          ["Standing", risk(percentage(records), db.thresholds)],
          [
            "Present / late",
            records.filter((a) => a.status === "Present" || a.status === "Late")
              .length,
          ],
          ["Absent", records.filter((a) => a.status === "Absent").length],
        ].map(([l, v]) => (
          <div className="stat-card" key={l}>
            <p>{l}</p>
            <h2>{v}</h2>
          </div>
        ))}
      </div>
      <div className="two-columns">
        <AttendanceCalendar studentId={s.id} />
        <section className="panel">
          <div className="panel-heading">
            <h2>Enrolled subjects & recent history</h2>
          </div>
          {db.classes
            .filter((c) => c.section === s.section)
            .map((c) => (
              <div className="list-row" key={c.id}>
                <b>{c.name}</b>
                <small>
                  {c.day} · {c.start}–{c.end}
                </small>
              </div>
            ))}
          {records
            .slice(-10)
            .reverse()
            .map((a) => (
              <div className="list-row" key={a.id}>
                <span>
                  {a.date} · {a.time}
                </span>
                <Badge>{a.status}</Badge>
              </div>
            ))}
        </section>
      </div>
    </>
  );
}
