import { randomUUID, pbkdf2Sync } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Internal demo provisioning only. No default identity or password is supplied. */
export function createAdministrator({
  name,
  username,
  email,
  password,
  confirmPassword,
}) {
  name = name?.trim();
  username = username?.trim().toLowerCase();
  email = email?.trim().toLowerCase();
  if (!name || name.length < 2) throw Error("Enter a full name.");
  if (!/^[a-z0-9_.-]{3,30}$/.test(username || ""))
    throw Error(
      "Enter a valid username (3–30 letters, numbers, dots, underscores or hyphens).",
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || ""))
    throw Error("Enter a valid email.");
  if (!password || password.length < 8 || password !== confirmPassword)
    throw Error("Passwords must match and contain at least 8 characters.");
  const id = randomUUID(),
    salt = randomUUID();
  return {
    id,
    name,
    username,
    email,
    role: "Administrator",
    status: "Active",
    profileId: id,
    salt,
    passwordHash: pbkdf2Sync(password, salt, 100000, 32, "sha256").toString(
      "hex",
    ),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  let hidden = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!hidden) process.stdout.write(chunk);
      callback();
    },
  });
  const reader = createInterface({
    input: process.stdin,
    output,
    terminal: !!process.stdin.isTTY,
  });
  const ask = async (prompt, secret = false) => {
    process.stdout.write(prompt);
    hidden = secret;
    const answer = await reader.question("");
    hidden = false;
    if (secret) process.stdout.write("\n");
    return answer;
  };
  try {
    const name = await ask("Administrator full name: ");
    const username = await ask("Username: ");
    const email = await ask("Email: ");
    const password = await ask("Demo password (hidden): ", true);
    const confirmPassword = await ask("Confirm password (hidden): ", true);
    const account = createAdministrator({
      name,
      username,
      email,
      password,
      confirmPassword,
    });
    await mkdir(".local", { recursive: true });
    const destination = `.local/admin-${account.id}.json`;
    await writeFile(destination, JSON.stringify(account, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    process.stdout.write(
      `Account record written to ${destination}. Follow the internal import instructions in README.md.\n`,
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } finally {
    reader.close();
  }
}
