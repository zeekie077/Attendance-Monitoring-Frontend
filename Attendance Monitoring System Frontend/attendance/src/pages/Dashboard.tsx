import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  Clock3,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Download,
  Radio,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useData } from "../services/store";
import { localDate } from "../data/seed";
import { percentage, exportCSV } from "../utils/attendance";
import { Stat, Avatar, Badge, PageTitle } from "../components/ui";
import { AttendanceCalendar } from "./Students";
import { StudentSummary } from "./StudentSummary";
import { getAttendanceSummary, getClassAttendance } from "../services/attendanceService";

export function Dashboard() {
  const { db, role, facultyId, currentStudent, account } = useData();
  const [range, setRange] = useState("7");
  const [chartView, setChartView] = useState("Daily");

  // State for live Express/MySQL backend data
  const [apiSummary, setApiSummary] = useState<any>(null);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLiveDashboardData() {
      try {
        const summaryData = await getAttendanceSummary(1);
        const logsData = await getClassAttendance(1);
        setApiSummary(summaryData);
        setApiLogs(logsData);
      } catch (err) {
        console.error("Dashboard API integration fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLiveDashboardData();
  }, []);

  const classes =
    role === "Faculty"
      ? db.classes.filter((c) => c.faculty === facultyId)
      : role === "Student"
        ? db.classes.filter((c) => c.section === currentStudent.section)
        : db.classes;

  const records = db.attendance.filter((a) =>
    role === "Student"
      ? a.studentId === currentStudent.id
      : classes.some((c) => c.id === a.classId),
  );

  const today = records.filter((a) => a.date === localDate());

  const activeStudents = db.students.filter(
    (s) =>
      !s.archived &&
      (role !== "Student" || s.id === currentStudent.id) &&
      (role !== "Faculty" || classes.some((c) => c.section === s.section)),
  );

  // Utilize live API numbers when loaded, with local store fallback
  const presentCount = apiSummary ? Number(apiSummary.present_count) : today.filter((a) => a.status === "Present").length;
  const lateCount = apiSummary ? Number(apiSummary.late_count) : today.filter((a) => a.status === "Late").length;
  const absentCount = apiSummary ? Number(apiSummary.absent_count) : today.filter((a) => a.status === "Absent").length;
  const totalRecordsCount = apiSummary ? Number(apiSummary.total_records) : today.length;
  const liveAttendanceRate = apiSummary ? Number(apiSummary.attendance_percentage) : percentage(records);

  const totals = [presentCount, lateCount, absentCount];

  const trend = Array.from({ length: Number(range) }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - Number(range) + 1 + i);
    const rows = records.filter((a) => a.date === localDate(date));
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      Present: rows.filter(
        (a) => a.status === "Present" || a.status === "Excused",
      ).length,
      Late: rows.filter((a) => a.status === "Late").length,
      Absent: rows.filter((a) => a.status === "Absent").length,
    };
  });

  const chartData =
    chartView === "Daily"
      ? trend
      : Array.from({ length: Math.ceil(trend.length / 7) }, (_, i) => ({
          date: `Week ${i + 1}`,
          Present: trend
            .slice(i * 7, i * 7 + 7)
            .reduce((n, x) => n + x.Present, 0),
          Late: trend.slice(i * 7, i * 7 + 7).reduce((n, x) => n + x.Late, 0),
          Absent: trend
            .slice(i * 7, i * 7 + 7)
            .reduce((n, x) => n + x.Absent, 0),
        }));

  const recent = apiLogs.length > 0 ? apiLogs.slice(0, 5) : [...today].reverse().slice(0, 5);

  const atRisk = activeStudents.filter(
    (s) =>
      percentage(records.filter((a) => a.studentId === s.id)) <
      db.thresholds.attention,
  );

  const pie = totals.map((value, i) => ({
    name: ["Present", "Late", "Absent"][i],
    value,
  }));

  return (
    <>
      <PageTitle
        title={
          role === "Student"
            ? "Your campus, at a glance."
            : `Good morning, ${account?.name.split(' ')[0] || 'there'} 👋`
        }
        description={
          role === "Student"
            ? "A little consistency goes a long way. Here’s your attendance journey."
            : "Here’s what’s happening across your campus today."
        }
      >
        <div className="date-pill">
          <CalendarDays size={16} />
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        <button
          className="button"
          onClick={() => exportCSV("attendance-overview.csv", records)}
        >
          <Download size={16} /> Export report
        </button>
      </PageTitle>

      <div className="semester-strip">
        <span>
          <span className="semester-tag">1ST SEMESTER</span> Academic Year 2026
          – 2027 <span className="strip-divider">|</span>{" "}
          <i className="live-dot" /> Attendance overview
        </span>
        <Link to="/schedule">
          View academic calendar <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="stats-grid">
        <Stat
          label={
            role === "Student" ? "Overall attendance" : "Registered students"
          }
          value={
            role === "Student"
              ? `${liveAttendanceRate}%`
              : activeStudents.length.toLocaleString()
          }
          detail={
            role === "Student"
              ? "Across enrolled subjects"
              : `${db.faculty.length} faculty members`
          }
          icon={<Users size={21} />}
        />
        <Stat
          label="Present today"
          value={totals[0]}
          detail={`${totalRecordsCount ? Math.round((totals[0] / totalRecordsCount) * 100) : 0}% of recorded attendance`}
          icon={<UserCheck size={21} />}
          color="green"
        />
        <Stat
          label="Absent today"
          value={totals[2]}
          detail="Recorded absences today"
          icon={<UserX size={21} />}
          color="red"
        />
        <Stat
          label="Late arrivals"
          value={totals[1]}
          detail="After the 15-minute grace period"
          icon={<Clock3 size={21} />}
          color="orange"
        />
      </div>

      <div className="dashboard-main-grid">
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Attendance trends{" "}
                <span className="subtle-badge">
                  {liveAttendanceRate}% overall
                </span>
              </h2>
              <p>A clearer picture of your campus attendance.</p>
            </div>
            <select
              aria-label="Dashboard date range"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
          <div className="chart-toolbar">
            <div className="segmented">
              {["Daily", "Weekly"].map((v) => (
                <button
                  className={v === chartView ? "selected" : ""}
                  key={v}
                  onClick={() => setChartView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="legend">
              <span>
                <i style={{ background: "#7164e8" }} />
                Present
              </span>
              <span>
                <i style={{ background: "#edb456" }} />
                Late
              </span>
              <span>
                <i style={{ background: "#e7a4a9" }} />
                Absent
              </span>
            </div>
          </div>
          <div className="trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 15, right: 10, bottom: 5, left: -25 }}
              >
                <defs>
                  <linearGradient id="purpleFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8174ec" stopOpacity={0.25} />
                    <stop
                      offset="100%"
                      stopColor="#8174ec"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 5"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#9094a5" }}
                  dy={10}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#9094a5" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Present"
                  stroke="#7968e7"
                  strokeWidth={3}
                  fill="url(#purpleFill)"
                />
                <Area
                  type="monotone"
                  dataKey="Late"
                  stroke="#e7b45c"
                  strokeWidth={2}
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="Absent"
                  stroke="#e9a6a9"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <i className="live-dot" /> Based on recorded attendance{" "}
            <span>{loading ? "Syncing API..." : "Connected to MySQL"}</span>
          </div>
        </section>

        <section className="panel breakdown-panel">
          <div className="panel-heading">
            <div>
              <h2>Today’s breakdown</h2>
              <p>Every check-in counts.</p>
            </div>
            <span className="live-badge">Live</span>
          </div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={pie}
                  innerRadius={72}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={5}
                  cornerRadius={5}
                  stroke="none"
                >
                  {["#7d6ae5", "#efbb64", "#ef999d"].map((c) => (
                    <Cell key={c} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-label">
              <strong>
                {liveAttendanceRate}
                <small>%</small>
              </strong>
              <span>Attendance rate</span>
            </div>
          </div>
          <div className="breakdown-legend">
            {pie.map((p, i) => (
              <div key={p.name}>
                <span>
                  <i
                    style={{ background: ["#7d6ae5", "#efbb64", "#ef999d"][i] }}
                  />
                  {p.name}
                </span>
                  <b>{p.value}</b>
                <small>
                  {totalRecordsCount
                    ? Math.round((p.value / totalRecordsCount) * 100)
                    : 0}
                  %
                </small>
              </div>
            ))}
          </div>
          <div className="attendance-note">
            <Activity size={15} />
            {role === "Student"
              ? "Keep showing up. It makes a difference."
              : `${activeStudents.length - new Set(today.map((a) => a.studentId)).size} students yet to be recorded`}
          </div>
        </section>
      </div>

      <div className="dashboard-second-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent attendance</h2>
              <p>The latest check-ins around campus.</p>
            </div>
            {role !== "Student" && (
              <Link className="text-link" to="/attendance">
                View all <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class / section</th>
                  <th>Time in</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a: any, idx: number) => {
                  const studentName = a.full_name || db.students.find((s) => s.id === a.studentId)?.name || "Student";
                  const studentNum = a.student_number || a.studentId || `STU-${idx + 1}`;
                  const photo = db.students.find((s) => s.id === a.studentId)?.photo;
                  const classCode = a.subject_code || "IT301";
                  const section = a.section || "3A";
                  const status = a.status || "Present";
                  const displayTime = a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (a.time ? a.time.slice(0, 5) : "10:00");

                  return (
                    <tr key={a.attendance_id || a.id || idx}>
                      <td>
                        <div className="person">
                          <Avatar name={studentName} photo={photo} />
                          <div>
                            <b>{studentName}</b>
                            <small>{studentNum}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <b>{classCode}</b>
                        <small>{section}</small>
                      </td>
                      <td>
                        {displayTime}{" "}
                        <small className="inline">Live</small>
                      </td>
                      <td>
                        <Badge>{status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!recent.length && (
              <p className="empty">No attendance recorded today.</p>
            )}
          </div>
        </section>

        <section className="insight-panel">
          <div className="insight-heading">
            <span>
              <Sparkles size={19} /> Smart insights
            </span>
            <span className="rule-tag">RULE-BASED</span>
          </div>
          <h3>
            A little insight.
            <br />A bigger impact.
          </h3>
          <p>Spot patterns early and help every student stay on track.</p>
          <div className="insight-item">
            <span className="insight-icon">
              <Users size={18} />
            </span>
            <div>
              <b>{atRisk.length} students need attention</b>
              <p>Attendance below {db.thresholds.attention}% this month.</p>
            </div>
            <ChevronRight size={16} />
          </div>
          <div className="insight-item">
            <span className="insight-icon orange">
              <Clock3 size={18} />
            </span>
            <div>
              <b>
                {lateCount} late arrivals recorded
              </b>
              <p>A timely reminder can make a difference.</p>
            </div>
          </div>
          {role !== "Student" && (
            <Link className="insight-button" to="/analytics">
              Explore all insights <ArrowUpRight size={16} />
            </Link>
          )}
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {role === "Student"
                  ? "Your program attendance"
                  : "Attendance by department"}
              </h2>
              <p>Consistency across every discipline.</p>
            </div>
            <GraduationCap size={20} className="muted" />
          </div>
          <div className="department-list">
            {[...new Set(activeStudents.map((s) => role === 'Student' ? s.course : db.programs.find(p => p.name === s.course)?.department || s.course))].map(
              (course, i) => {
                const ids = activeStudents
                  .filter((s) => (role === 'Student' ? s.course : db.programs.find(p => p.name === s.course)?.department || s.course) === course)
                  .map((s) => s.id);
                const rate = percentage(
                  records.filter((a) => ids.includes(a.studentId)),
                );
                return (
                  <div key={course}>
                    <span className="department-icon">
                      {course.replace('BS ', '').split(' ').slice(0,2).map(word => word[0]).join('')}
                    </span>
                    <div>
                      <b>{course.replace("BS ", "")}</b>
                      <div className="progress">
                        <span
                          style={{
                            width: `${rate}%`,
                            background: [
                              "#8775e5",
                              "#6fa8d6",
                              "#79bda9",
                              "#d5b47b",
                            ][i],
                          }}
                        />
                      </div>
                    </div>
                    <strong>{rate}%</strong>
                  </div>
                );
              },
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Today’s classes</h2>
              <p>A day of learning, well organized.</p>
            </div>
            <Link className="text-link" to="/schedule">
              View schedule <ArrowRight size={14} />
            </Link>
          </div>
          <div className="class-list">
            {classes.filter(c => c.day === new Date().toLocaleDateString('en-US', {weekday:'long'})).sort((a,b) => a.start.localeCompare(b.start)).slice(0, 3).map((c) => (
              <Link to="/schedule" key={c.id}>
                <div className="class-time">
                  {c.start}
                  <small>{c.end}</small>
                </div>
                <div>
                  <b>{c.name}</b>
                  <small>
                    {c.section} <span>·</span> {c.room}
                  </small>
                </div>
                <Badge>{c.active ? "Active" : "Upcoming"}</Badge>
              </Link>
            ))}
            {!classes.some(c => c.day === new Date().toLocaleDateString('en-US', {weekday:'long'})) && <div className="empty">No classes scheduled today. Enjoy the breathing room.</div>}
          </div>
        </section>
      </div>

      {role === "Student" && (
        <>
          <StudentSummary />
          <AttendanceCalendar studentId={currentStudent.id} />
        </>
      )}

      <div className="system-strip">
        <span>
          <Radio size={15} />
          <b>{db.devices.filter((d) => d.online).length} devices online</b>
          <i /> {classes.filter((c) => c.active).length} active sessions
        </span>
        <span>
          Made for better campus days <Sparkles size={14} />
        </span>
      </div>
    </>
  );
}