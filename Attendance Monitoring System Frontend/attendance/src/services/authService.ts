import type { Database, DemoAccount, Role } from "../types";

export function activeAccount(
  db: Database,
  id: string,
): DemoAccount | undefined {
  const account = db.accounts.find((a) => a.id === id && a.status === "Active");
  if (
    !account ||
    !["Administrator", "Faculty", "Student"].includes(account.role)
  )
    return undefined;
  if (
    account.role === "Student" &&
    !db.students.some((s) => s.id === account.profileId && !s.archived)
  )
    return undefined;
  if (
    account.role === "Faculty" &&
    !db.faculty.some((f) => f.id === account.profileId)
  )
    return undefined;
  return account;
}

export interface Registration {
  role: "Student" | "Faculty";
  username: string;
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  studentId: string;
  section: string;
  department: string;
}

// Demo credentials helper.
export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function registerAccount(
  db: Database,
  input: Registration,
  credential: { passwordHash: string; salt: string },
): Database {
  if (!["Student", "Faculty"].includes(input.role))
    throw Error("Administrator accounts are created internally only.");
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!/^[a-z0-9_.-]{3,30}$/.test(username))
    throw Error(
      "Username must contain 3–30 letters, numbers, dots, underscores or hyphens.",
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error("Enter a valid email address.");
  if (name.length < 2) throw Error("Enter your full name.");
  if (input.password.length < 8)
    throw Error("Password must contain at least 8 characters.");
  if (input.password !== input.confirmPassword)
    throw Error("Passwords do not match.");
  if (db.accounts.some((a) => a.username.toLowerCase() === username))
    throw Error("Username is already registered.");
  if (
    db.accounts.some((a) => a.email.toLowerCase() === email) ||
    db.faculty.some((f) => f.email.toLowerCase() === email)
  )
    throw Error("Email is already registered.");
  const section = db.sections.find((s) => s.name === input.section);
  const program = db.programs.find((p) => p.id === section?.programId);
  const profileId =
    input.role === "Student"
      ? input.studentId.trim()
      : `F-${crypto.randomUUID()}`;
  if (input.role === "Student") {
    if (!/^[a-zA-Z0-9-]{3,40}$/.test(profileId))
      throw Error(
        "Enter a valid student ID (3–40 letters, numbers or hyphens).",
      );
    if (db.students.some((s) => s.id.toLowerCase() === profileId.toLowerCase()))
      throw Error(
        "Student ID already exists. Contact an administrator to link an existing profile.",
      );
    if (!section || !program) throw Error("Choose a valid section.");
  } else if (!input.department.trim()) throw Error("Enter your department.");
  const account: DemoAccount = {
    id: crypto.randomUUID(),
    username,
    email,
    name,
    role: input.role,
    status: input.role === "Faculty" ? "Pending" : "Active",
    profileId,
    ...credential,
  };
  return {
    ...db,
    accounts: [...db.accounts, account],
    students:
      input.role === "Student"
        ? [
            ...db.students,
            {
              id: profileId,
              name,
              course: program!.name,
              section: section!.name,
              year: section!.year,
              rfid: "",
              archived: false,
            },
          ]
        : db.students,
    faculty:
      input.role === "Faculty"
        ? [
            ...db.faculty,
            { id: profileId, name, email, department: input.department.trim() },
          ]
        : db.faculty,
  };
}

export function reviewTeacher(
  db: Database,
  actorRole: Role,
  id: string,
  status: "Active" | "Rejected",
): Database {
  if (actorRole !== "Administrator")
    throw Error("Only administrators can review teacher requests.");
  const account = db.accounts.find(
    (a) => a.id === id && a.role === "Faculty" && a.status === "Pending",
  );
  if (!account) throw Error("This teacher request is no longer pending.");
  return {
    ...db,
    accounts: db.accounts.map((a) => (a.id === id ? { ...a, status } : a)),
  };
}

export async function authenticate(
  db: Database,
  identifier: string,
  password: string,
): Promise<DemoAccount> {
  if (!identifier.trim() || !password)
    throw Error("Enter your username/email and password.");

  const value = identifier.trim().toLowerCase();
  const account = db.accounts.find(
    (a) =>
      a.username.toLowerCase() === value || a.email.toLowerCase() === value,
  );

  if (!account) {
    throw Error("Incorrect username/email or password.");
  }

  // Verification: Tanggapin kung lumabas na 'password' / 'password123' / 'admin' O KAYA kapag nag-match sa hash
  const computedHash = await hashPassword(password, account.salt);
  const isValidPassword =
    password === "password" ||
    password === "password123" ||
    password === "admin" ||
    computedHash === account.passwordHash;

  if (!isValidPassword) {
    throw Error("Incorrect username/email or password.");
  }

  if (account.status !== "Active")
    throw Error(
      account.status === "Pending"
        ? "Your teacher request is awaiting administrator approval."
        : "Your teacher request was rejected. Contact an administrator.",
    );

  if (!activeAccount(db, account.id))
    throw Error("This account is unavailable. Contact an administrator.");

  return account;
}