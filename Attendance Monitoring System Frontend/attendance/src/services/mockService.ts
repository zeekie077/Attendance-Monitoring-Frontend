import type { Database } from "../types";
import { seed } from "../data/seed";

const DATA_KEY = "campuspulse-v1";

/** LocalStorage adapter. Backend integration belongs here, outside page components. */
export const mockService = {
  load(): Database {
    try {
      const value = localStorage.getItem(DATA_KEY);
      if (value) {
        const data = JSON.parse(value);
        const collections = [
          "students",
          "faculty",
          "classes",
          "attendance",
          "corrections",
          "notices",
          "devices",
        ];
        if (
          collections.every((key) => Array.isArray(data[key])) &&
          data.students.length > 0 &&
          data.thresholds
        ) {
          const defaults = seed();
          const existing: Database['accounts'] = Array.isArray(data.accounts) ? data.accounts.filter((a: {id: string; salt: string}) => !(a.id === 'internal-admin' && a.salt === 'campuspulse-internal-admin-v1')) : [];
          const accounts = defaults.accounts.map(demo => {
            const account = existing.find(a => a.id === demo.id || a.username.toLowerCase() === demo.username);
            return {...demo, id: account?.id || demo.id};
          });
          return {
            ...defaults,
            ...data,
            accounts: [...accounts, ...existing.filter(a => !accounts.some(demo => demo.id === a.id || demo.username === a.username.toLowerCase()))],
            students: [...data.students, ...defaults.students.filter(s => accounts.some(a => a.role === 'Student' && a.profileId === s.id) && !data.students.some((existing: {id: string}) => existing.id === s.id))],
            faculty: [...data.faculty, ...defaults.faculty.filter(f => accounts.some(a => a.role === 'Faculty' && a.profileId === f.id) && !data.faculty.some((existing: {id: string}) => existing.id === f.id))],
            programs: data.programs || defaults.programs,
            sections: data.sections || defaults.sections,
          };
        }
      }
    } catch {
      /* Corrupt or unavailable storage falls back to a fresh demo. */
    }
    return seed();
  },
  save(data: Database): void {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  },
};
