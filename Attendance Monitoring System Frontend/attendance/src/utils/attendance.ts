import type { Attendance, Database } from "../types";
export function percentage(records: Attendance[]) {
  return records.length
    ? Math.round(
        (records.filter((a) =>
          ["Present", "Late", "Excused"].includes(a.status),
        ).length /
          records.length) *
          100,
      )
    : 0;
}
export function risk(value: number, thresholds: Database["thresholds"]) {
  return value >= thresholds.good
    ? "Good Standing"
    : value >= thresholds.attention
      ? "Needs Attention"
      : value >= thresholds.risk
        ? "At Risk"
        : "Critical Attendance";
}
export function exportCSV<T extends object>(filename: string, rows: T[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (x: unknown) =>
    `"${String(x ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const blob = new Blob(
    [
      "\uFEFF" +
        [
          keys.map(escape).join(","),
          ...rows.map((r) =>
            keys.map((k) => escape(r[k as keyof T])).join(","),
          ),
        ].join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
