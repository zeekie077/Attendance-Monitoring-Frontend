import type { Database } from "../types";
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function seed(): Database {
  const names = [
    "Isabella Santos",
    "Miguel Dela Cruz",
    "Sofia Reyes",
    "Gabriel Mendoza",
    "Andrea Garcia",
    "Juan Rafael Torres",
    "Maria Villanueva",
    "Lucas Bautista",
    "Camille Navarro",
    "Paolo Aquino",
    "Bianca Ramos",
    "Daniel Castillo",
    "Jasmine Flores",
    "Rafael Lim",
    "Angela Mercado",
    "Marco Gonzales",
    "Patricia Soriano",
    "Joshua Fernandez",
    "Nicole Santiago",
    "Luis Rivera",
    "Alyssa Tan",
    "Enzo Cruz",
    "Bea Domingo",
    "Christian Tolentino",
  ];
  const students = names.map((name, i) => ({
    id: `2024-${String(i + 101).padStart(5, "0")}`,
    name,
    course: [
      "BS Computer Science",
      "BS Information Technology",
      "BS Business Administration",
      "BS Engineering",
    ][i % 4],
    section: ["CS 3A", "IT 2B", "BA 2A", "ENG 1A"][i % 4],
    year: [3, 2, 2, 1][i % 4],
    rfid: `RFID-${1001 + i}`,
    archived: false,
  }));
  const faculty = [
    {
      id: "F001",
      name: "Dr. Amelia Ramos",
      department: "Computer Studies",
      email: "a.ramos@campus.edu.ph",
    },
    {
      id: "F002",
      name: "Prof. Carlo Bautista",
      department: "Engineering",
      email: "c.bautista@campus.edu.ph",
    },
    {
      id: "F003",
      name: "Prof. Elena Cruz",
      department: "Business Administration",
      email: "e.cruz@campus.edu.ph",
    },
  ];
  const classes = [
    {
      id: "C01",
      name: "Data Structures & Algorithms",
      code: "CS 301",
      section: "CS 3A",
      faculty: "F001",
      room: "CCS Building · Room 301",
      day: "Wednesday",
      start: "08:00",
      end: "09:30",
      active: true,
    },
    {
      id: "C02",
      name: "Web Systems & Technologies",
      code: "IT 204",
      section: "IT 2B",
      faculty: "F001",
      room: "Computer Lab 02",
      day: "Wednesday",
      start: "10:00",
      end: "11:30",
      active: true,
    },
    {
      id: "C03",
      name: "Principles of Management",
      code: "BA 201",
      section: "BA 2A",
      faculty: "F003",
      room: "Business Building · Room 204",
      day: "Thursday",
      start: "13:00",
      end: "14:30",
      active: false,
    },
    {
      id: "C04",
      name: "Engineering Mathematics",
      code: "ENG 102",
      section: "ENG 1A",
      faculty: "F002",
      room: "Engineering Hall · Room 102",
      day: "Friday",
      start: "09:00",
      end: "10:30",
      active: false,
    },
    {id: "C05", name: "Database Management Systems", code: "CS 302", section: "CS 3A", faculty: "F001", room: "Computer Lab 02", day: "Monday", start: "13:00", end: "14:30", active: false},
    {id: "C06", name: "Information Management", code: "IT 205", section: "IT 2B", faculty: "F001", room: "Computer Lab 02", day: "Tuesday", start: "08:00", end: "09:30", active: false},
    {id: "C07", name: "Business Finance", code: "BA 202", section: "BA 2A", faculty: "F003", room: "Business Building · Room 204", day: "Monday", start: "10:00", end: "11:30", active: false},
    {id: "C08", name: "Applied Physics", code: "ENG 103", section: "ENG 1A", faculty: "F002", room: "Engineering Hall · Room 102", day: "Thursday", start: "09:00", end: "10:30", active: false},
  ];
  const attendance: Database["attendance"] = [];
  for (let d = 83; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if ([0, 6].includes(date.getDay())) continue;
    students.forEach((s, i) => {
      if (d === 0 && i > 15) return;
      const session = classes.find(c => c.section === s.section && c.day === date.toLocaleDateString('en-US', {weekday: 'long'}));
      if (!session) return;
      const n = (i * 7 + d * 3) % 20;
      const status = n < (i === 3 ? 9 : 2) ? "Absent" : n < 5 ? "Late" : "Present";
      const [hour, minute] = session.start.split(':').map(Number);
      const timestamp = new Date(date);
      timestamp.setHours(hour, minute + (status === 'Late' ? 20 : 3), i % 60);
      attendance.push({
        id: `seed-${d}-${i}`,
        studentId: s.id,
        classId: session.id,
        date: localDate(date),
        time: timestamp.toLocaleTimeString('en-GB'),
        status,
        method: "RFID",
        device: `D0${(i % 3) + 1}`,
      });
    });
  }
  const programs = [
    { id: "P01", name: "BS Computer Science", department: "Computer Studies" },
    {
      id: "P02",
      name: "BS Information Technology",
      department: "Computer Studies",
    },
    {
      id: "P03",
      name: "BS Business Administration",
      department: "Business Administration",
    },
    { id: "P04", name: "BS Engineering", department: "Engineering" },
  ];
  const sections = programs.map((p, i) => ({
    id: "S0" + (i + 1),
    name: ["CS 3A", "IT 2B", "BA 2A", "ENG 1A"][i],
    programId: p.id,
    year: [3, 2, 2, 1][i],
  }));
  const ruleNotices: Database['notices'] = [];
  students.forEach(student => {
    const records = attendance.filter(a => a.studentId === student.id);
    const rate = records.length ? records.filter(a => a.status !== 'Absent').length / records.length * 100 : 0;
    const lateCount = records.filter(a => a.status === 'Late').length;
    const absence = records.filter(a => a.status === 'Absent').at(-1);
    const add = (category: string, title: string, description: string) => ruleNotices.push({id: `${category}-${student.id}`,category,title,description,time: new Date().toISOString(),read:false,studentId:student.id});
    if (absence) add('Absence alert','A missed class to review',`${student.name} was marked absent on ${absence.date}.`);
    if (lateCount >= 3) add('Repeated tardiness','A small head start makes a difference',`${student.name} has ${lateCount} late arrivals in recorded history.`);
    if (rate < 80) add('Low attendance','Attendance below 80%',`${student.name} has ${Math.round(rate)}% attendance. Review the attendance calendar for details.`);
  });
  return {
    programs,
    sections,
    students,
    faculty,
    classes,
    attendance,
    corrections: [
      {
        id: "CR01",
        studentId: students[3].id,
        classId: "C04",
        date: attendance.filter(a => a.studentId === students[3].id && a.classId === 'C04' && a.status === 'Absent').at(-1)?.date || localDate(),
        explanation:
          "I attended the class but my RFID card did not register at the terminal.",
        attachment: "",
        status: "Pending",
      },
    ],
    notices: [
      ...ruleNotices,
      {
        id: "N01",
        title: "Attendance needs a little attention",
        description: "Review students below the attendance threshold.",
        category: "Attendance alert",
        time: new Date().toISOString(),
        read: false,
      },
      {
        id: "N02",
        title: "A correction is ready for review",
        description: "Gabriel Mendoza submitted an attendance correction.",
        category: "Correction",
        time: new Date().toISOString(),
        read: false,
      },
      {
        id: "N03",
        title: "Your next class is coming up",
        description: "Data Structures & Algorithms · CCS Room 301",
        category: "Upcoming class",
        time: new Date().toISOString(),
        read: true,
      },
    ],
    devices: [
      {
        id: "D01",
        name: "CCS Main Terminal",
        room: "CCS Building · Room 301",
        online: true,
        health: 98,
      },
      {
        id: "D02",
        name: "Computer Lab Terminal",
        room: "Computer Lab 02",
        online: true,
        health: 95,
      },
      {
        id: "D03",
        name: "Engineering Terminal",
        room: "Engineering Hall · Room 102",
        online: false,
        health: 62,
      },
    ],
    // Requested demo logins. These use the same password verification as registered accounts.
    accounts: [
      {id: 'demo-student', username: 'student', email: 'student@campuspulse.demo', name: students[0].name, role: 'Student', status: 'Active', profileId: students[0].id, salt: 'campuspulse-demo-student-v1', passwordHash: 'ceacb993989dd52e33daed62ba14c884180c8277c21e2601aa83bd8c4cb4031f'},
      {id: 'demo-admin', username: 'admin', email: 'admin@campuspulse.demo', name: 'Demo Administrator', role: 'Administrator', status: 'Active', profileId: 'demo-admin', salt: 'campuspulse-demo-admin-v1', passwordHash: '75eb9f6138f213826502f0592f989b25aef683c120c5a69837feebfd9ccadb76'},
      {id: 'demo-faculty', username: 'faculty', email: 'faculty@campuspulse.demo', name: faculty[0].name, role: 'Faculty', status: 'Active', profileId: faculty[0].id, salt: 'campuspulse-demo-faculty-v1', passwordHash: '10357cd3dc94c3dd58f9d4af98f57f4dabb9a8f2806d27a1079126267ff57c19'},
    ],
    thresholds: { good: 90, attention: 80, risk: 75 },
  };
}
