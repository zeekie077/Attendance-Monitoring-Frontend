const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
// Transpile real domain modules in memory, keeping tests independent of the UI bundler.
const cache = new Map();
function load(file) {
  file = path.resolve(__dirname, "..", file);
  if (cache.has(file)) return cache.get(file);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) =>
      name.startsWith(".")
        ? load(
            path.relative(
              path.resolve(__dirname, ".."),
              path.resolve(path.dirname(file), name + ".ts"),
            ),
          )
        : require(name),
    mod,
    mod.exports,
  );
  cache.set(file, mod.exports);
  return mod.exports;
}
const { seed } = load("src/data/seed.ts");
const { createCheckIn, attendanceStreak } = load(
  "src/services/attendanceService.ts",
);
const { percentage, risk } = load("src/utils/attendance.ts");
const { saveManualAttendance } = load("src/services/attendanceService.ts");
const {
  registerAccount,
  authenticate,
  hashPassword,
  reviewTeacher,
  activeAccount,
} = load("src/services/authService.ts");
const { reportRange } = load("src/services/reportService.ts");
const { filterHistory } = load("src/services/historyService.ts");
const { canViewNotice, canAccessRoute } = load("src/utils/permissions.ts");
const { mockService } = load("src/services/mockService.ts");
test('requested demo logins authenticate with 123456 in new and existing workspaces', async () => {
  const original = seed();
  const previous = global.localStorage;
  const saved = {...original, accounts: []};
  global.localStorage = {getItem: () => JSON.stringify(saved)};
  try {
    const migrated = mockService.load();
    assert.deepEqual(migrated.attendance, saved.attendance);
    for (const db of [original, migrated]) {
      for (const [username, role] of [['student', 'Student'], ['admin', 'Administrator'], ['faculty', 'Faculty']]) {
        const account = await authenticate(db, username, '123456');
        assert.equal(account.role, role);
        assert.ok(activeAccount(db, account.id));
        await assert.rejects(authenticate(db, username, 'incorrect'), /Incorrect/);
      }
    }
  } finally { if (previous === undefined) delete global.localStorage; else global.localStorage = previous; }
});
test("stored attendance survives account-schema migration and registered accounts survive reload", () => {
  const data = seed();
  delete data.accounts;
  let stored = JSON.stringify(data);
  const previous = global.localStorage;
  global.localStorage = {
    getItem: () => stored,
    setItem: (_key, value) => {
      stored = value;
    },
  };
  try {
    const migrated = mockService.load();
    assert.deepEqual(migrated.attendance, data.attendance);
    assert.deepEqual(migrated.accounts, seed().accounts);
    const registered = registerAccount(migrated, registration(migrated), {
      passwordHash: "hash",
      salt: "salt",
    });
    mockService.save(registered);
    assert.deepEqual(mockService.load(), registered);
  } finally {
    if (previous === undefined) delete global.localStorage;
    else global.localStorage = previous;
  }
});
function fixture() {
  const db = seed();
  db.attendance = [];
  return db;
}

function registration(db, overrides = {}) {
  return {
    role: "Student",
    name: "New Student",
    username: "new.student",
    email: "new@example.test",
    password: "DemoPassword123",
    confirmPassword: "DemoPassword123",
    studentId: "2026-99999",
    section: db.sections[0].name,
    department: "Computing",
    ...overrides,
  };
}
test("student registration validates unique identities and creates an enrolled profile without an admin role", () => {
  const db = fixture(),
    input = registration(db),
    credential = { passwordHash: "hash", salt: "salt" };
  const next = registerAccount(db, input, credential);
  assert.equal(next.accounts.at(-1).status, "Active");
  assert.equal(next.students.at(-1).section, input.section);
  assert.equal(next.students.at(-1).year, db.sections[0].year);
  assert.ok(!("password" in next.accounts.at(-1)));
  assert.throws(
    () =>
      registerAccount(
        next,
        { ...input, username: " NEW.STUDENT " },
        credential,
      ),
    /Username is already/,
  );
  assert.throws(
    () =>
      registerAccount(
        next,
        { ...input, username: "another", email: "NEW@example.test" },
        credential,
      ),
    /Email is already/,
  );
  assert.throws(
    () =>
      registerAccount(
        db,
        { ...input, studentId: db.students[0].id },
        credential,
      ),
    /Student ID already/,
  );
  for (const override of [
    { password: "short" },
    { confirmPassword: "different" },
    { email: "invalid" },
    { username: "x" },
    { name: " " },
    { section: "unknown" },
    { role: "Administrator" },
  ])
    assert.throws(() =>
      registerAccount(db, { ...input, ...override }, credential),
    );
});
test("teacher credentials cannot sign in until administrator approval; rejection remains blocked", async () => {
  const db = fixture(),
    input = registration(db, { role: "Faculty" });
  const salt = "test-salt",
    passwordHash = await hashPassword(input.password, salt);
  const next = registerAccount(db, input, { salt, passwordHash });
  const account = next.accounts.at(-1);
  assert.equal(account.status, "Pending");
  assert.equal(next.faculty.at(-1).id, account.profileId);
  await assert.rejects(
    authenticate(next, input.username, input.password),
    /awaiting administrator approval/,
  );
  assert.throws(
    () => reviewTeacher(next, "Student", account.id, "Active"),
    /Only administrators/,
  );
  const approved = reviewTeacher(next, "Administrator", account.id, "Active");
  assert.equal(
    (await authenticate(approved, " NEW@EXAMPLE.TEST ", input.password)).id,
    account.id,
  );
  await assert.rejects(
    authenticate(approved, input.username, "wrong-password"),
    /Incorrect/,
  );
  await assert.rejects(
    authenticate(
      reviewTeacher(next, "Administrator", account.id, "Rejected"),
      input.username,
      input.password,
    ),
    /rejected/,
  );
});

test("internally provisioned administrator uses supplied credentials alongside demo accounts", async () => {
  const { createAdministrator } =
    await import("../scripts/provision-admin.mjs");
  const db = fixture();
  assert.equal(db.accounts.length, 3);
  const password = crypto.randomUUID();
  const account = createAdministrator({
    name: "Test Operator",
    username: "test.operator",
    email: "operator@example.test",
    password,
    confirmPassword: password,
  });
  assert.ok(!("password" in account));
  db.accounts.push(account);
  assert.equal(
    (await authenticate(db, account.username, password)).role,
    "Administrator",
  );
  await assert.rejects(
    authenticate(db, account.username, "wrong"),
    /Incorrect/,
  );
});
test("route access is denied without an account role and respects student/faculty restrictions", () => {
  for (const path of ["/", "/students", "/attendance", "/reports", "/settings"])
    assert.equal(canAccessRoute(null, path), false);
  for (const role of ["Student", "Faculty"]) {
    for (const path of [
      "/faculty",
      "/teacher-requests",
      "/academics",
      "/settings",
      "/devices",
    ])
      assert.equal(canAccessRoute(role, path), false);
    assert.equal(canAccessRoute(role, "/"), true);
  }
  assert.equal(canAccessRoute("Student", "/attendance/manual"), false);
  assert.equal(canAccessRoute("Student", "/students"), false);
  assert.equal(canAccessRoute("Student", "/my-attendance"), true);
  assert.equal(canAccessRoute("Faculty", "/attendance/manual"), true);
  assert.equal(canAccessRoute("Administrator", "/settings"), true);
});
test("session restoration rejects pending, missing-profile, archived and unsupported accounts", () => {
  let db = registerAccount(fixture(), registration(fixture()), {
    salt: "salt",
    passwordHash: "hash",
  });
  const account = db.accounts.at(-1);
  assert.equal(activeAccount(db, account.id).profileId, account.profileId);
  assert.equal(activeAccount(db, "unknown"), undefined);
  assert.equal(
    activeAccount(
      { ...db, accounts: [{ ...account, status: "Pending" }] },
      account.id,
    ),
    undefined,
  );
  assert.equal(
    activeAccount(
      { ...db, accounts: [{ ...account, role: "Other" }] },
      account.id,
    ),
    undefined,
  );
  assert.equal(
    activeAccount(
      {
        ...db,
        students: db.students.filter((s) => s.id !== account.profileId),
      },
      account.id,
    ),
    undefined,
  );
  assert.equal(
    activeAccount(
      { ...db, students: db.students.map((s) => ({ ...s, archived: true })) },
      account.id,
    ),
    undefined,
  );
});
test("manual attendance supports all statuses, edits without duplicates, and keeps other dates/classes intact", () => {
  const db = fixture(),
    session = db.classes[0];
  const roster = db.students.filter(
    (s) => !s.archived && s.section === session.section,
  );
  const statuses = ["Present", "Absent", "Late", "Excused"];
  const entries = roster.map((s, i) => ({
    studentId: s.id,
    status: statuses[i % 4],
  }));
  db.attendance.push({
    id: "other",
    studentId: roster[0].id,
    classId: session.id,
    date: "2020-01-01",
    time: "08:00",
    method: "QR",
    device: "Demo QR",
    status: "Present",
  });
  const next = saveManualAttendance(
    db,
    "Faculty",
    session.faculty,
    session.id,
    "2020-01-02",
    entries,
  );
  assert.equal(next.attendance.length, roster.length + 1);
  assert.ok(
    statuses.every((status) =>
      next.attendance.some((a) => a.status === status),
    ),
  );
  const changed = saveManualAttendance(
    next,
    "Administrator",
    "",
    session.id,
    "2020-01-02",
    entries.map((e) => ({ ...e, status: "Present" })),
  );
  assert.equal(changed.attendance.length, next.attendance.length);
  assert.deepEqual(
    changed.attendance.map((a) => a.id).sort(),
    next.attendance.map((a) => a.id).sort(),
  );
  assert.equal(changed.attendance.find((a) => a.id === "other").method, "QR");
  assert.equal(percentage(changed.attendance), 100);
  session.active = false;
  assert.doesNotThrow(() =>
    saveManualAttendance(
      db,
      "Administrator",
      "",
      session.id,
      "2020-01-02",
      entries,
    ),
  );
  for (const args of [
    ["Student", "", session.id, "2020-01-02", entries],
    ["Faculty", "not-assigned", session.id, "2020-01-02", entries],
    ["Administrator", "", session.id, "2999-01-01", entries],
    ["Administrator", "", session.id, "2020-02-31", entries],
    ["Administrator", "", session.id, "2020-01-02", entries.slice(1)],
    [
      "Administrator",
      "",
      session.id,
      "2020-01-02",
      entries.map((e) => ({ ...e, status: "Pending" })),
    ],
  ])
    assert.throws(() => saveManualAttendance(db, ...args));
});
test("history composes name/ID, exact date, inclusive range, subject, section and status filters", () => {
  const db = fixture(),
    session = db.classes[0],
    student = db.students.find((s) => s.section === session.section);
  db.attendance = ["2020-01-01", "2020-01-02", "2020-01-03"].map((date, i) => ({
    id: String(i),
    studentId: student.id,
    classId: session.id,
    date,
    time: "08:00",
    status: i === 1 ? "Late" : "Present",
  }));
  const filters = {
    search: "",
    status: "All statuses",
    classId: "All classes",
    section: "",
    date: "",
    from: "",
    to: "",
  };
  assert.equal(
    filterHistory(db, db.classes, {
      ...filters,
      search: student.name.toUpperCase(),
    }).length,
    3,
  );
  assert.equal(
    filterHistory(db, db.classes, {
      ...filters,
      search: student.id,
      classId: session.id,
      section: session.section,
      from: "2020-01-01",
      to: "2020-01-02",
      date: "2020-01-02",
      status: "Late",
    }).length,
    1,
  );
  assert.equal(filterHistory(db, [], filters).length, 0);
  assert.equal(
    filterHistory(db, db.classes, { ...filters, section: "unknown" }).length,
    0,
  );
  assert.equal(
    filterHistory(db, db.classes, {
      ...filters,
      from: "2020-01-03",
      to: "2020-01-01",
    }).length,
    0,
  );
});
test("daily, weekly and monthly reports use calendar boundaries including leap years", () => {
  assert.deepEqual(reportRange("Daily", "2026-09-30"), {
    start: "2026-09-30",
    end: "2026-09-30",
  });
  assert.deepEqual(reportRange("Weekly", "2026-10-04"), {
    start: "2026-09-28",
    end: "2026-10-04",
  });
  assert.deepEqual(reportRange("Monthly", "2024-02-10"), {
    start: "2024-02-01",
    end: "2024-02-29",
  });
  assert.throws(() => reportRange("Daily", "2026-02-31"));
});
test("notifications follow the signed-in identity instead of the original demo student/teacher", () => {
  const db = fixture();
  const notice = { studentId: db.students[0].id, category: "Check-in" };
  assert.equal(
    canViewNotice(db, "Student", notice, "new-student", "new-faculty"),
    false,
  );
  assert.equal(
    canViewNotice(db, "Faculty", notice, "new-student", "new-faculty"),
    false,
  );
  assert.equal(
    canViewNotice(
      db,
      "Student",
      { ...notice, studentId: "new-student" },
      "new-student",
    ),
    true,
  );
});
test("RFID marks a check-in present inside the grace period and late afterwards", () => {
  const db = fixture();
  assert.equal(
    createCheckIn(
      db,
      db.students[0].id,
      "C01",
      "RFID",
      "D01",
      new Date(2026, 8, 30, 8, 15),
    ).status,
    "Present",
  );
  assert.equal(
    createCheckIn(
      db,
      db.students[0].id,
      "C01",
      "RFID",
      "D01",
      new Date(2026, 8, 30, 8, 16),
    ).status,
    "Late",
  );
});
test("RFID and QR share duplicate protection; an absent record is correctable by check-in", () => {
  const db = fixture();
  const now = new Date(2026, 8, 30, 8, 0);
  const first = createCheckIn(db, db.students[0].id, "C01", "RFID", "D01", now);
  db.attendance.push(first);
  assert.throws(
    () => createCheckIn(db, db.students[0].id, "C01", "QR", "Demo QR", now),
    /Duplicate/,
  );
  db.attendance[0].status = "Absent";
  assert.equal(
    createCheckIn(db, db.students[0].id, "C01", "QR", "Demo QR", now).status,
    "Present",
  );
});
test("invalid identities, enrollment, sessions, and devices are rejected", () => {
  const db = fixture();
  assert.throws(
    () => createCheckIn(db, "unknown", "C01", "RFID", "D01"),
    /Unregistered/,
  );
  assert.throws(
    () => createCheckIn(db, db.students[1].id, "C01", "RFID", "D01"),
    /not enrolled/,
  );
  assert.throws(
    () => createCheckIn(db, db.students[0].id, "C01", "RFID", "D03"),
    /offline/,
  );
  db.classes[0].active = false;
  assert.throws(
    () => createCheckIn(db, db.students[0].id, "C01", "RFID", "D01"),
    /closed/,
  );
  db.students[0].archived = true;
  assert.throws(
    () => createCheckIn(db, db.students[0].id, "C01", "RFID", "D01"),
    /Unregistered/,
  );
});
test("attendance percentages and risk thresholds respect exact boundaries", () => {
  assert.equal(percentage([]), 0);
  assert.equal(
    percentage([
      { status: "Present" },
      { status: "Late" },
      { status: "Excused" },
      { status: "Absent" },
    ]),
    75,
  );
  const limits = { good: 90, attention: 80, risk: 75 };
  assert.equal(risk(90, limits), "Good Standing");
  assert.equal(risk(80, limits), "Needs Attention");
  assert.equal(risk(75, limits), "At Risk");
  assert.equal(risk(74, limits), "Critical Attendance");
});
test("streak counts class days and stops on any absence that day", () => {
  assert.equal(
    attendanceStreak([
      { date: "2026-09-30", status: "Present" },
      { date: "2026-09-29", status: "Late" },
      { date: "2026-09-28", status: "Absent" },
      { date: "2026-09-25", status: "Present" },
    ]),
    2,
  );
});
