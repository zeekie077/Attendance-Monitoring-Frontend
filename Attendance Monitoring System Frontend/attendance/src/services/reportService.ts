import { localDate } from "../data/seed";

/** Calendar periods in the same local timezone as attendance dates; weeks start Monday. */
export function reportRange(
  period: string,
  anchor: string,
): { start: string; end: string } {
  const date = new Date(`${anchor}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || localDate(date) !== anchor)
    throw Error("Choose a valid report date.");
  const start = new Date(date),
    end = new Date(date);
  if (period === "Weekly") {
    start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (period === "Monthly") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }
  return { start: localDate(start), end: localDate(end) };
}
