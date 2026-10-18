export type Role = "Administrator" | "Faculty" | "Student";
export type Status = "Present" | "Late" | "Absent" | "Excused" | "Pending";
export interface Student {
  id: string;
  name: string;
  course: string;
  section: string;
  year: number;
  rfid: string;
  archived: boolean;
  photo?: string;
}
export interface Faculty {
  id: string;
  name: string;
  department: string;
  email: string;
}
export interface ClassItem {
  id: string;
  name: string;
  code: string;
  section: string;
  faculty: string;
  room: string;
  day: string;
  start: string;
  end: string;
  active: boolean;
}
export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  time: string;
  status: Status;
  method: string;
  device: string;
}
export interface Correction {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  explanation: string;
  attachment: string;
  status: "Pending" | "Approved" | "Rejected";
}
export interface Notice {
  id: string;
  title: string;
  description: string;
  category: string;
  time: string;
  read: boolean;
  studentId?: string;
}
export interface Device {
  id: string;
  name: string;
  room: string;
  online: boolean;
  health: number;
}
export interface Program {
  id: string;
  name: string;
  department: string;
}
export interface Section {
  id: string;
  name: string;
  programId: string;
  year: number;
}
export interface Database {
  accounts: DemoAccount[];
  students: Student[];
  faculty: Faculty[];
  classes: ClassItem[];
  attendance: Attendance[];
  corrections: Correction[];
  notices: Notice[];
  devices: Device[];
  programs: Program[];
  sections: Section[];
  thresholds: { good: number; attention: number; risk: number };
}
export interface DemoAccount {
  id: string;
  username: string;
  email: string;
  name: string;
  role: Role;
  status: "Active" | "Pending" | "Rejected";
  profileId: string;
  passwordHash: string;
  salt: string;
}
