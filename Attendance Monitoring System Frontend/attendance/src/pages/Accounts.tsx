import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, Empty, PageTitle } from "../components/ui";
import { useData } from "../services/store";
import type { Registration } from "../services/authService";

export function AuthPage({ registration = false }: { registration?: boolean }) {
  const { db, register, login } = useData();
  const navigate = useNavigate();
  const [role, setRole] = useState<"Student" | "Faculty">("Student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <>
      <PageTitle
        title={
          registration ? "Create an account" : "Attendance Monitoring System"
        }
        description={
          registration
            ? "CampusPulse account registration"
            : "Login to your CampusPulse account"
        }
      />
      <div className="notice-banner">
        Frontend-only demo authentication. Accounts are stored in this browser.
        Use a demo password, not a real password. Authentication can later be
        replaced with Firebase Authentication or a backend.
      </div>
      <section className="panel account-form">
        {success ? (
          <div className="padded">
            <p role="status">{success}</p>
            <Link className="button primary" to="/login">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form
            className="form-grid padded"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setError("");
              setBusy(true);
              const form = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              try {
                if (registration) {
                  await register({ ...form, role } as unknown as Registration);
                  setSuccess(
                    role === "Faculty"
                      ? "Teacher request submitted. An administrator must approve your account before you can sign in."
                      : "Student account created. You can now sign in.",
                  );
                } else {
                  await login(form.identifier, form.password);
                  navigate("/", { replace: true });
                }
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {registration ? (
              <>
                <label>
                  Account type
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as typeof role);
                      setError("");
                    }}
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty">Teacher — requires approval</option>
                  </select>
                </label>
                <p className="muted">
                  Administrator accounts are created internally. Teacher
                  accounts remain pending until reviewed.
                </p>
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Username
                  <input
                    name="username"
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_.\-]+"
                    autoComplete="username"
                  />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </label>
                {role === "Student" ? (
                  <>
                    <label>
                      Student ID
                      <input
                        name="studentId"
                        required
                        minLength={3}
                        maxLength={40}
                      />
                    </label>
                    <label>
                      Program / section
                      <select name="section" required>
                        <option value="">Choose your section</option>
                        {db.sections.map((s) => (
                          <option key={s.id} value={s.name}>
                            {
                              db.programs.find((p) => p.id === s.programId)
                                ?.name
                            }{" "}
                            · {s.name} · Year {s.year}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <label>
                    Department
                    <input name="department" required />
                  </label>
                )}
              </>
            ) : (
              <label>
                Username or email
                <input name="identifier" required autoComplete="username" />
              </label>
            )}
            <label>
              Password
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={registration ? 8 : undefined}
                autoComplete={
                  registration ? "new-password" : "current-password"
                }
              />
            </label>
            {registration && (
              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
            )}
            <label className="password-toggle">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              Show password
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : registration
                  ? role === "Faculty"
                    ? "Submit teacher request"
                    : "Create student account"
                  : "Login"}
            </button>
            <Link
              className="text-link"
              to={registration ? "/login" : "/register"}
            >
              {registration
                ? "Already have an account? Sign in"
                : "Create a student account or request a teacher account"}
            </Link>
          </form>
        )}
      </section>
    </>
  );
}

export function TeacherRequests() {
  const { db, approveTeacher, notify } = useData();
  const requests = db.accounts.filter((a) => a.role === "Faculty");
  return (
    <>
      <PageTitle
        title="Teacher account requests"
        description="Review teacher registrations before activating access. Assign approved teachers to classes in Classes & schedules."
      />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Department</th>
                <th>Status</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name}</b>
                    <small>
                      {a.username} · {a.email}
                    </small>
                  </td>
                  <td>
                    {db.faculty.find((f) => f.id === a.profileId)?.department}
                  </td>
                  <td>
                    <Badge>{a.status}</Badge>
                  </td>
                  <td>
                    {a.status === "Pending" && (
                      <div className="actions">
                        {(["Active", "Rejected"] as const).map((status) => (
                          <button
                            className="button"
                            key={status}
                            onClick={() => {
                              try {
                                approveTeacher(a.id, status);
                              } catch (err) {
                                notify((err as Error).message);
                              }
                            }}
                          >
                            {status === "Active" ? "Approve" : "Reject"}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!requests.length && (
            <Empty text="No teacher registration requests yet." />
          )}
        </div>
      </section>
    </>
  );
}
