import { Link } from "react-router-dom";
import { Flame, ArrowRight, Bell } from "lucide-react";
import { useData } from "../services/store";
import { attendanceStreak } from "../services/attendanceService";
import { percentage, risk } from "../utils/attendance";
import { Badge } from "../components/ui";

export function StudentSummary() {
  const { db, currentStudent } = useData();
  const student = currentStudent;
  const records = db.attendance.filter((a) => a.studentId === student.id);
  const standing = risk(percentage(records), db.thresholds);
  const notices = db.notices.filter(
    (n) => n.studentId === student.id || n.category === "Upcoming class",
  );
  return (
    <div className="two-columns">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              <Flame size={18} /> {attendanceStreak(records)} class-day streak
            </h2>
            <p>Consecutive recorded class days without an absence.</p>
          </div>
          <Badge>{standing}</Badge>
        </div>
        <div className="list-row personal-totals">{['Present','Late','Absent','Excused'].map(status => <div key={status}><strong>{records.filter(a => a.status === status).length}</strong><small>{status} records</small></div>)}</div>
        {db.classes
          .filter((c) => c.section === student.section)
          .map((c) => (
            <div className="list-row" key={c.id}>
              <div>
                <b>{c.name}</b>
                <small>
                  {c.day} · {c.start}–{c.end}
                </small>
              </div>
              <strong>
                {percentage(records.filter((a) => a.classId === c.id))}%
              </strong>
            </div>
          ))}
        <div className="list-row">
          {percentage(records) >= db.thresholds.good
            ? "Keep your momentum — your attendance is in good standing."
            : "Your attendance is below the good-standing threshold. Review missed classes and submit a correction if needed."}
        </div>
        <div className="list-row">
          <Link className="text-link" to="/corrections">
            Request an attendance correction <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            <Bell size={17} /> Your latest updates
          </h2>
          <Link className="text-link" to="/notifications">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {notices.slice(0, 4).map((n) => (
          <div className="list-row" key={n.id}>
            <div>
              <b>{n.title}</b>
              <small>{n.description}</small>
            </div>
            {!n.read && <Badge>Unread</Badge>}
          </div>
        ))}
        {!notices.length && <div className="empty">You’re all caught up.</div>}
      </section>
    </div>
  );
}
