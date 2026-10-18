# CampusPulse Attendance Monitoring

Existing React + TypeScript + Vite frontend with local demo data. Run commands in `attendance` with Node 22.13 or newer.

- `npm start`: start the development server.
- `npm test`: run domain regression tests.
- `npm run typecheck`: validate TypeScript.
- `npm run build`: create the production bundle in `dist`.
- `npm run build:portable`: existing build alternative for environments that cannot spawn esbuild.
- `npm run preview:portable`: serve the built app.

## Registration and demo sign-in

Use the registration link on the Login page. `/register` creates student accounts or submits teacher requests. Registration validates full name, username, email, password confirmation, student ID and section or teacher department. Usernames, emails and student IDs are checked for duplicates, without case sensitivity. A student profile is created with the selected section's program and year. Existing student IDs require administrator-assisted linking; public registration cannot claim an existing profile.

Teachers cannot sign in until an administrator approves them under **Teacher requests**. Rejected requests remain blocked. After approval, an administrator assigns classes through **Classes & schedules**. Signed-in teachers see their assigned classes; students see their own attendance and notifications.

## Login and protected access

The website opens at /login before showing the system layout. Successful login reads the role from the matching account and redirects to /, which renders the existing Administrator, Faculty or Student dashboard. There is no role selector. The requested demo logins are student / 123456, admin / 123456, and faculty / 123456. Refresh restores a valid session after a checking-authentication state. Logout clears the session and protects Back navigation and direct URLs. Public routes are /login and /register only.

Roles retain the existing Administrator / Faculty / Student values in each Database.accounts record. Attendance history and My attendance use the authenticated student's profile ID. Role allowlists protect routes as well as navigation; changing the old campuspulse-role storage value has no effect.

This remains frontend-only demo authentication: the account database is in localStorage (campuspulse-v1) and the active account ID is in sessionStorage (campuspulse-account). Passwords use salted PBKDF2 hashes, never plaintext. Browser storage is editable; these guards are not server authorization. Replace authService.ts and the store/session adapter with Firebase Authentication or a backend for real use. Existing attendance and registered accounts survive migration. The former built-in demonstration administrator is removed during migration.

## Internal administrator provisioning

The three requested demo accounts are available immediately, including in existing saved workspaces after refresh. Additional administrators can be created outside public registration:

1. Run `node scripts/provision-admin.mjs` in this directory.
2. Enter a chosen name, username, email and demo password at the prompts. Password input is hidden.
3. The command creates a unique JSON account file in .local (ignored by Git); it contains only a salted password hash.
4. Open the app's Login page, then use browser developer tools for this internal, frontend-only setup. Assign the generated JSON object to a variable named account and run the following snippet. Do not paste a plaintext password.

```js
const data = JSON.parse(localStorage.getItem('campuspulse-v1'));
if (data.accounts.some(a => a.username.toLowerCase() === account.username.toLowerCase() || a.email.toLowerCase() === account.email.toLowerCase())) {
  throw new Error('An account with that username or email already exists.');
}
data.accounts.push(account);
localStorage.setItem('campuspulse-v1', JSON.stringify(data));
location.reload();
```

The operator can then log in with the chosen credentials and approve faculty requests. This internal setup is not a public signup flow. Resetting demo data preserves internally provisioned administrators, restores the three demo accounts, clears other registrations and attendance changes, and logs out.

## Manual attendance and history

Teachers and administrators use **Manual attendance**, or **Record attendance manually** from Attendance. Select a subject/class, section and date; the roster uses active students assigned to that section. Choose Present, Absent, Late or Excused for every student, or use **Mark All Present**, then save. Dates must be today or earlier. Administrators can use all classes; teachers can use assigned classes. Closed RFID/QR sessions can still be recorded manually.

Selecting an existing class/date loads saved statuses for editing. History also has an **Edit record** link. Saving updates each student/class/date record without duplicating it and preserves unrelated records. Unchanged RFID/QR records keep their original method; changed entries are marked Manual. New manual records have no invented check-in time.

The shared attendance store updates dashboard totals/charts, percentages, history, student profiles, heatmaps, risk analytics and reports immediately. The existing attendance-rate rule counts Present, Late and Excused as attended.

**Attendance history** supports student name or ID search, exact date, inclusive date range, subject/class, section and status. Filters combine and apply to CSV exports. Clear filters resets the view.

## Reports and existing features

Reports offer Daily, Weekly (Monday-Sunday), Monthly (calendar month) and Custom periods. **Report date** selects the calendar period; changing From/To switches to Custom. Choose an Individual student or Class / section scope, then select the requested student/class/section. Department and status filters remain available. Reports include all four attendance statuses, a chart, counts, detailed records, CSV export and printing.

RFID simulation, expiring QR sessions, duplicate check-in prevention, correction requests, risk detection, analytics, notifications, student heatmaps, device monitoring, academic management and theme switching remain in the existing UI.
