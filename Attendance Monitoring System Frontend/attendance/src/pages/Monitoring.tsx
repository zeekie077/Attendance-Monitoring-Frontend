import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Radio,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Download,
  Play,
  Square,
  Wifi,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { useData } from "../services/store";
import { Avatar, Badge, Empty, PageTitle, SearchBox } from "../components/ui";
import { exportCSV } from "../utils/attendance";
import type { Attendance } from "../types";
import { filterHistory } from "../services/historyService";
export function Monitoring() {
  const { db, role, update, notify, facultyId, currentStudent } = useData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [classId, setClassId] = useState("All classes");
  const [page, setPage] = useState(1);
  const [section, setSection] = useState("");
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalidRange = !!(from && to && from > to);
  const classes = db.classes.filter((c) =>
    role === "Student"
      ? c.section === currentStudent.section
      : role !== "Faculty" || c.faculty === facultyId,
  );
  const rows = filterHistory(
    role === "Student"
      ? {
          ...db,
          attendance: db.attendance.filter(
            (a) => a.studentId === currentStudent.id,
          ),
        }
      : db,
    classes,
    {
      search,
      status,
      classId,
      section,
      date,
      from,
      to,
    },
  );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages);
  return (
    <>
      <PageTitle
        title="Attendance monitoring"
        description="Every student. Every check-in. One connected view."
      >
        {role !== "Student" && (
          <Link className="button primary" to="/attendance/manual">
            Record attendance manually
          </Link>
        )}
        <span className="live-badge">
          <i className="live-dot" />
          Live demo
        </span>
        <button
          className="button"
          onClick={() => exportCSV("attendance-logs.csv", rows)}
        >
          <Download size={16} />
          Export logs
        </button>
      </PageTitle>
      {role !== "Student" && (
        <div className="session-grid">
          {classes.map((c) => (
            <div className="panel session-card" key={c.id}>
              <div className="actions spread">
                <Badge>{c.active ? "Active" : "Closed"}</Badge>
                <button
                  className="icon-button"
                  aria-label={`${c.active ? "Close" : "Open"} ${c.code} session`}
                  onClick={() => {
                    update((d) => ({
                      ...d,
                      classes: d.classes.map((x) =>
                        x.id === c.id ? { ...x, active: !x.active } : x,
                      ),
                    }));
                    notify(`Session ${c.active ? "closed" : "opened"}.`);
                  }}
                >
                  {c.active ? <Square size={17} /> : <Play size={17} />}
                </button>
              </div>
              <h3>{c.name}</h3>
              <p>
                {c.section} · {c.start}–{c.end}
              </p>
              <small>{c.room}</small>
            </div>
          ))}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Attendance history{" "}
            <span className="subtle-badge">{rows.length} records</span>
          </h2>
        </div>
        <div className="filter-row">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search student name, ID or date…"
          />
          <select
            aria-label="Attendance status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {[
              "All statuses",
              "Present",
              "Late",
              "Absent",
              "Excused",
              "Pending",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Class filter"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPage(1);
            }}
          >
            <option>All classes</option>
            {classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.code} · {c.name} · {c.section}
              </option>
            ))}
          </select>
          <label>
            Section
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All sections</option>
              {[...new Set(classes.map((c) => c.section))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Exact date
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            From
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <button
            className="button"
            onClick={() => {
              setSearch("");
              setStatus("All statuses");
              setClassId("All classes");
              setSection("");
              setDate("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
        {invalidRange && (
          <p className="form-error padded" role="alert">
            From date must be on or before To date.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject / room</th>
                <th>Date & time</th>
                <th>Method / device</th>
                <th>Status</th>
                {role !== "Student" && <th>Edit</th>}
              </tr>
            </thead>
            <tbody>
              {rows.slice((current - 1) * 10, current * 10).map((a) => {
                const s = db.students.find((s) => s.id === a.studentId)!;
                const c = db.classes.find((c) => c.id === a.classId);
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="person">
                        <Avatar name={s.name} photo={s.photo} />
                        <div>
                          <b>{s.name}</b>
                          <small>{s.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <b>
                        {c?.code} · {c?.section}
                      </b>
                      <small>{c?.room}</small>
                    </td>
                    <td>
                      {a.date}
                      <small>{a.time}</small>
                    </td>
                    <td>
                      {a.method}
                      <small>
                        {db.devices.find((d) => d.id === a.device)?.name ||
                          a.device}
                      </small>
                    </td>
                    <td>
                      <Badge>{a.status}</Badge>
                    </td>
                    {role !== "Student" && (
                      <td>
                        <Link
                          className="text-link"
                          to={`/attendance/manual?class=${encodeURIComponent(a.classId)}&date=${a.date}`}
                        >
                          Edit record
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty />}
        </div>
        <div className="pagination">
          <span>{rows.length} matching records</span>
          <div className="actions">
            <button
              className="button"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            {current} / {pages}
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
    </>
  );
}
export function Simulator({ qr = false }: { qr?: boolean }) {
  const { db, scan, role, facultyId } = useData();
  const classes = db.classes.filter(
    (c) => role !== "Faculty" || c.faculty === facultyId,
  );
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [card, setCard] = useState("");
  const [device, setDevice] = useState("D01");
  const [token, setToken] = useState("");
  const [expires, setExpires] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<Attendance | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((expires - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expires]);
  const students = db.students.filter(
    (s) =>
      !s.archived &&
      s.section === db.classes.find((c) => c.id === classId)?.section,
  );
  const submit = () => {
    setError("");
    setResult(null);
    if (qr && (!token || remaining === 0)) {
      setError("Generate an active QR session before checking in.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      try {
        if (qr && Date.now() >= expires)
          throw Error("This QR session expired. Generate a new code.");
        const s = db.students.find((s) => s.rfid === card);
        setResult(
          scan(
            s?.id || "",
            classId,
            qr ? "QR" : "RFID",
            qr ? "Demo QR" : device,
          ),
        );
      } catch (e) {
        setError((e as Error).message);
      }
      setBusy(false);
    }, 600);
  };
  const student = db.students.find((s) => s.id === result?.studentId);
  return (
    <>
      <PageTitle
        title={qr ? "QR attendance" : "RFID attendance simulator"}
        description={
          qr
            ? "A quick check-in. More time for learning."
            : "Experience a connected campus, one tap at a time."
        }
      />
      <div className="notice-banner">
        <SparkleLabel /> Frontend simulation · Demo tokens and devices are not
        production authentication or hardware connections.
      </div>
      <div className="two-columns simulator-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>Session setup</h2>
            <Badge>
              {db.classes.find((c) => c.id === classId)?.active
                ? "Active"
                : "Closed"}
            </Badge>
          </div>
          <div className="form-grid padded">
            <label>
              Class session
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setToken("");
                  setExpires(0);
                  setCard("");
                  setResult(null);
                }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name} ({c.section})
                  </option>
                ))}
              </select>
            </label>
            {!qr && (
              <label>
                Attendance device
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                >
                  {db.devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.online ? "Online" : "Offline"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {qr ? "Student check-in simulation" : "RFID card number"}
              <input
                list="student-cards"
                value={card}
                onChange={(e) => setCard(e.target.value)}
                placeholder="Select a student or enter RFID-1017"
              />
              <datalist id="student-cards">
                {students.map((s) => (
                  <option key={s.id} value={s.rfid}>
                    {s.name}
                  </option>
                ))}
              </datalist>
            </label>
            <label>
              Select an enrolled student
              <select value={card} onChange={(e) => setCard(e.target.value)}>
                <option value="">Choose student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.rfid}>
                    {s.name} · {s.rfid}
                  </option>
                ))}
              </select>
            </label>
            {qr && (
              <button
                className="button"
                disabled={!db.classes.find((c) => c.id === classId)?.active}
                onClick={() => {
                  setToken(crypto.randomUUID());
                  setExpires(Date.now() + 120000);
                  setError("");
                }}
              >
                Generate new QR session
              </button>
            )}
            <button
              className="button primary"
              disabled={busy || !card}
              onClick={submit}
            >
              {qr ? <QrCode size={18} /> : <Radio size={18} />}{" "}
              {busy
                ? "Verifying…"
                : qr
                  ? "Simulate student check-in"
                  : "Simulate RFID tap"}
            </button>
            <p className="muted">
              Try an unrecorded student such as Patricia Soriano or Alyssa Tan.
              Repeat a check-in to test duplicate prevention. Arrival status
              uses the class start time and a 15-minute grace period.
            </p>
          </div>
        </section>
        <section className="terminal">
          <div className="terminal-heading">
            <span>
              <ActivityIcon /> CAMPUSPULSE TERMINAL
            </span>
            <span>
              <Wifi size={14} />
              {qr
                ? "QR session"
                : db.devices.find((d) => d.id === device)?.online
                  ? "Device online"
                  : "Device offline"}
            </span>
          </div>
          {qr ? (
            <div className="qr-area">
              {token && remaining > 0 ? (
                <QRCodeSVG
                  value={JSON.stringify({
                    demo: true,
                    session: classId,
                    token,
                    expires,
                  })}
                  size={210}
                />
              ) : (
                <QrCode size={120} />
              )}
              <h2>
                {token
                  ? remaining > 0
                    ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} remaining`
                    : "QR session expired"
                  : "Ready for a new session"}
              </h2>
              <p>Generate a QR code to begin demo check-ins.</p>
            </div>
          ) : (
            <div className="rfid-area">
              <motion.div
                className="scan-rings"
                animate={busy ? { scale: [1, 1.15, 1] } : {}}
                transition={{ repeat: busy ? Infinity : 0, duration: 0.6 }}
              >
                <Radio size={70} />
              </motion.div>
              <h2>
                {busy ? "Verifying your identity…" : "Ready when you are."}
              </h2>
              <p>Tap a card. Make your presence count.</p>
              <span className="terminal-dots">● ● ● ● ●</span>
            </div>
          )}
          {error && (
            <div className="verification error" role="alert">
              <AlertCircle size={22} />
              <div>
                <b>Check-in unsuccessful</b>
                <p>{error}</p>
              </div>
            </div>
          )}
          {result && student && (
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="verification"
            >
              <Avatar name={student.name} photo={student.photo} />
              <div>
                <b>{student.name}</b>
                <p>
                  {student.id} · {result.date} {result.time}
                </p>
                <Badge>{result.status}</Badge>
              </div>
              <CheckCircle2 size={26} />
            </motion.div>
          )}
          <div className="terminal-footer">
            WESTBRIDGE UNIVERSITY <span>DEMO MODE</span>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Recent {qr ? "QR" : "RFID"} check-ins</h2>
        </div>
        {db.attendance
          .filter(
            (a) => a.method === (qr ? "QR" : "RFID") && a.classId === classId,
          )
          .slice(-6)
          .reverse()
          .map((a) => (
            <div className="list-row" key={a.id}>
              <span>{db.students.find((s) => s.id === a.studentId)?.name}</span>
              <small>
                {a.date} · {a.time}
              </small>
              <Badge>{a.status}</Badge>
            </div>
          ))}
      </section>
    </>
  );
}
function SparkleLabel() {
  return <Radio size={16} />;
}
function ActivityIcon() {
  return <Radio size={17} />;
}
