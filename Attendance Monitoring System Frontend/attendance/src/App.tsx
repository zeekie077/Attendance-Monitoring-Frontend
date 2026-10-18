import { useTheme } from "./hooks/useTheme";
import { PageSkeleton } from "./components/PageSkeleton";
import { useEffect, useState, lazy, Suspense, type ComponentType } from "react";
import {
  NavLink,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  BarChart3,
  FileText,
  Radio,
  QrCode,
  Bell,
  Settings,
  PanelLeftClose,
  Menu,
  Moon,
  Sun,
  Search,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  CircleHelp,
  ClipboardCheck,
} from "lucide-react";
import { useData } from "./services/store";
import { canViewNotice, canAccessRoute } from "./utils/permissions";
import { Avatar } from "./components/ui";
import { AuthPage, TeacherRequests } from "./pages/Accounts";
const ManualAttendance = lazy(() =>
  import("./pages/ManualAttendance").then((m) => ({
    default: m.ManualAttendance,
  })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Students = lazy(() =>
  import("./pages/Students").then((m) => ({ default: m.Students })),
);
const StudentProfile = lazy(() =>
  import("./pages/Students").then((m) => ({ default: m.StudentProfile })),
);
const Monitoring = lazy(() =>
  import("./pages/Monitoring").then((m) => ({ default: m.Monitoring })),
);
const Simulator = lazy(() =>
  import("./pages/Monitoring").then((m) => ({ default: m.Simulator })),
);
const FacultyPage = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.FacultyPage })),
);
const Schedule = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.Schedule })),
);
const Reports = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.Reports })),
);
const Insights = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.Insights })),
);
const Notifications = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.Notifications })),
);
const Corrections = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.Corrections })),
);
const Devices = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.Devices })),
);
const SettingsPage = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.SettingsPage })),
);
const Academics = lazy(() =>
  import("./pages/Academics").then((m) => ({ default: m.Academics })),
);
const navigation: {
  label: string;
  items: [string, string, ComponentType<{ size?: number }>][];
}[] = [
  {
    label: "Overview",
    items: [
      ["Dashboard", "/", LayoutDashboard],
      ["My attendance", "/my-attendance", ClipboardCheck],
      ["Attendance", "/attendance", ClipboardCheck],
      ["Manual attendance", "/attendance/manual", ClipboardCheck],
      ["Analytics & insights", "/analytics", BarChart3],
    ],
  },
  {
    label: "Management",
    items: [
      ["Students", "/students", Users],
      ["Faculty", "/faculty", GraduationCap],
      ["Teacher requests", "/teacher-requests", Users],
      ["Programs & sections", "/academics", GraduationCap],
      ["Classes & schedules", "/schedule", CalendarDays],
      ["Reports", "/reports", FileText],
    ],
  },
  {
    label: "Tools & workspace",
    items: [
      ["RFID simulator", "/rfid", Radio],
      ["QR attendance", "/qr", QrCode],
      ["Devices", "/devices", Activity],
      ["Correction requests", "/corrections", ClipboardCheck],
    ],
  },
];
export default function App() {
  const {
    role,
    authLoading,
    db,
    toast,
    facultyId,
    currentStudent,
    account,
    logout,
  } = useData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { dark, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setMobile(false), [location.pathname]);
  const allowed = (path: string) => canAccessRoute(role, path);
  if (authLoading)
    return (
      <main className="auth-shell">
        <p role="status">Checking authentication...</p>
      </main>
    );
  if (!account)
    return (
      <main className="auth-shell">
        <div className="auth-content">
          <Routes>
            <Route path="/login" element={<AuthPage key="login" />} />
            <Route
              path="/register"
              element={<AuthPage key="register" registration />}
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </main>
    );
  const name = account.name;
  const guard = (path: string, node: React.ReactNode) =>
    allowed(path) ? node : <Navigate to="/" replace />;
  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <NavLink className="brand" to="/" aria-label="CampusPulse home">
          <span className="brand-symbol">
            <Activity size={25} />
          </span>
          <span>
            Campus<span className="brand-light">Pulse</span>
            <small>ATTENDANCE MANAGEMENT</small>
          </span>
        </NavLink>
        <div className="workspace">
          <span className="university-icon">
            <GraduationCap size={22} />
          </span>
          <div>
            <b>Westbridge University</b>
            <small>Academic Year 2026–2027</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav>
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items
                .filter(([, path]) => allowed(path))
                .map(([label, path, Icon]) => (
                  <NavLink
                    end={path === "/" || path === "/attendance"}
                    key={path}
                    to={path}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                    {path === "/attendance" && <i className="live-dot" />}
                    {path === "/corrections" &&
                      db.corrections.some((c) => c.status === "Pending") && (
                        <small className="nav-count">
                          {
                            db.corrections.filter((c) => c.status === "Pending")
                              .length
                          }
                        </small>
                      )}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <span>
              <Sparkles size={16} /> Your campus, connected.
            </span>
            <p>
              Better attendance.
              <br />
              Brighter possibilities.
            </p>
            <button
              onClick={() =>
                navigate(role === "Student" ? "/schedule" : "/analytics")
              }
            >
              Explore insights <ArrowUpRight size={15} />
            </button>
          </div>
          {role === "Administrator" && (
            <NavLink className="bottom-link" to="/settings">
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          )}
          <button
            className="bottom-link"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={18} />
            <span>Collapse sidebar</span>
          </button>
          <div className="sidebar-footer">
            <i className="live-dot" />
            <span>All systems operational</span>
            <small>v1.0</small>
          </div>
        </div>
      </aside>
      {mobile && (
        <div className="sidebar-shade" onClick={() => setMobile(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobile(!mobile)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <b>
              {navigation
                .flatMap((g) => g.items)
                .find(([, p]) => p === location.pathname)?.[0] || "My campus"}
            </b>
          </div>
          <div className="topbar-actions">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(
                  role === "Student"
                    ? "/schedule"
                    : `/students?q=${encodeURIComponent(query)}`,
                );
              }}
            >
              <Search size={16} />
              <input
                placeholder="Search anything…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search campus"
              />
              <kbd>↵</kbd>
            </form>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <NavLink
              to="/notifications"
              className="icon-button notification-bell"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {db.notices.some(
                (n) =>
                  !n.read &&
                  canViewNotice(db, role, n, currentStudent.id, facultyId),
              ) && <i />}
            </NavLink>
            <span className="top-divider" />
            <Avatar name={name} />
            <div className="user-info">
              <b>{name}</b>
              <>
                <small>{role} · Demo account</small>
                <button
                  className="text-link"
                  onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  Logout
                </button>
              </>
            </div>
          </div>
        </header>
        <main>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route
                path="/teacher-requests"
                element={guard("/teacher-requests", <TeacherRequests />)}
              />
              <Route
                path="/attendance/manual"
                element={guard(
                  "/attendance/manual",
                  <ManualAttendance key={account?.id || role} />,
                )}
              />
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/my-attendance"
                element={guard("/my-attendance", <StudentProfile />)}
              />
              <Route
                path="/students"
                element={guard("/students", <Students />)}
              />
              <Route
                path="/students/:id"
                element={guard("/students", <StudentProfile />)}
              />
              <Route
                path="/attendance"
                element={guard("/attendance", <Monitoring />)}
              />
              <Route path="/rfid" element={guard("/rfid", <Simulator />)} />
              <Route path="/qr" element={guard("/qr", <Simulator qr />)} />
              <Route
                path="/academics"
                element={guard("/academics", <Academics />)}
              />
              <Route
                path="/faculty"
                element={guard("/faculty", <FacultyPage />)}
              />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/reports" element={guard("/reports", <Reports />)} />
              <Route
                path="/analytics"
                element={guard("/analytics", <Insights />)}
              />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/corrections" element={<Corrections />} />
              <Route path="/devices" element={guard("/devices", <Devices />)} />
              <Route
                path="/settings"
                element={guard("/settings", <SettingsPage />)}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="page-footer">
          <span>© 2026 CampusPulse. A more connected campus.</span>
          <span>
            <CircleHelp size={13} /> Frontend demo · Philippine Standard Time
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <ClipboardCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
