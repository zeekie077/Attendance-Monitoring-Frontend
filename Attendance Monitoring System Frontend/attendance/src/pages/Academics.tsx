import { useState } from "react";
import { BookOpen, Plus, Pencil } from "lucide-react";
import { useData } from "../services/store";
import { PageTitle, Modal, Badge, Empty } from "../components/ui";
import type { Program, Section } from "../types";

export function Academics() {
  const { db, update, notify } = useData();
  const [program, setProgram] = useState<Partial<Program> | null>(null);
  const [section, setSection] = useState<Partial<Section> | null>(null);
  return (
    <>
      <PageTitle
        title="Programs & sections"
        description="Give every student a place in your academic community."
      >
        <button className="button" onClick={() => setSection({})}>
          <Plus size={16} />
          Add section
        </button>
        <button className="button primary" onClick={() => setProgram({})}>
          <Plus size={16} />
          Add program
        </button>
      </PageTitle>
      <div className="two-columns">
        {db.programs.map((p) => (
          <section className="panel academic-card" key={p.id}>
            <div className="panel-heading">
              <div>
                <h2>
                  <BookOpen size={18} />
                  {p.name}
                </h2>
                <p>{p.department}</p>
              </div>
              <button
                className="icon-button"
                aria-label={`Edit ${p.name}`}
                onClick={() => setProgram(p)}
              >
                <Pencil size={16} />
              </button>
            </div>
            {db.sections
              .filter((s) => s.programId === p.id)
              .map((s) => (
                <div className="list-row" key={s.id}>
                  <div>
                    <b>{s.name}</b>
                    <small>
                      Year {s.year} ·{" "}
                      {
                        db.students.filter(
                          (student) =>
                            !student.archived && student.section === s.name,
                        ).length
                      }{" "}
                      enrolled students
                    </small>
                  </div>
                  <Badge>{`${db.classes.filter((c) => c.section === s.name).length} classes`}</Badge>
                  <button
                    className="icon-button"
                    aria-label={`Edit section ${s.name}`}
                    onClick={() => setSection(s)}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              ))}
            {!db.sections.some((s) => s.programId === p.id) && (
              <Empty text="Add a section to start organizing this program." />
            )}
          </section>
        ))}
      </div>
      {program && (
        <Modal
          title={program.id ? "Edit academic program" : "Add academic program"}
          onClose={() => setProgram(null)}
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const name = String(f.get("name")).trim();
              const department = String(f.get("department")).trim();
              if (!name || !department) {
                notify("Program name and department are required.");
                return;
              }
              if (
                db.programs.some(
                  (p) =>
                    p.id !== program.id &&
                    p.name.toLowerCase() === name.toLowerCase(),
                )
              ) {
                notify("That program already exists.");
                return;
              }
              const item: Program = {
                id: program.id || crypto.randomUUID(),
                name,
                department,
              };
              update((d) => ({
                ...d,
                programs: program.id
                  ? d.programs.map((p) => (p.id === program.id ? item : p))
                  : [...d.programs, item],
                students: d.students.map((s) =>
                  s.course === program.name ? { ...s, course: name } : s,
                ),
              }));
              setProgram(null);
              notify("Academic program saved.");
            }}
          >
            <label>
              Program name
              <input
                name="name"
                required
                defaultValue={program.name}
                placeholder="BS Computer Science"
              />
            </label>
            <label>
              Department
              <input
                name="department"
                required
                defaultValue={program.department}
                placeholder="Computer Studies"
              />
            </label>
            <button className="button primary">Save program</button>
          </form>
        </Modal>
      )}
      {section && (
        <Modal
          title={section.id ? "Edit section" : "Add section"}
          onClose={() => setSection(null)}
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const name = String(f.get("name")).trim();
              const programId = String(f.get("programId"));
              const year = Number(f.get("year"));
              if (!name) {
                notify("Section name is required.");
                return;
              }
              if (
                db.sections.some(
                  (s) =>
                    s.id !== section.id &&
                    s.name.toLowerCase() === name.toLowerCase(),
                )
              ) {
                notify("That section name already exists.");
                return;
              }
              const item: Section = {
                id: section.id || crypto.randomUUID(),
                name,
                programId,
                year,
              };
              const course = db.programs.find((p) => p.id === programId)!.name;
              update((d) => ({
                ...d,
                sections: section.id
                  ? d.sections.map((s) => (s.id === section.id ? item : s))
                  : [...d.sections, item],
                students: d.students.map((s) =>
                  s.section === section.name
                    ? { ...s, section: name, course, year }
                    : s,
                ),
                classes: d.classes.map((c) =>
                  c.section === section.name ? { ...c, section: name } : c,
                ),
              }));
              setSection(null);
              notify("Section saved.");
            }}
          >
            <label>
              Section name
              <input
                name="name"
                required
                defaultValue={section.name}
                placeholder="CS 3B"
              />
            </label>
            <label>
              Program
              <select name="programId" defaultValue={section.programId}>
                {db.programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Year level
              <input
                name="year"
                type="number"
                min="1"
                max="5"
                required
                defaultValue={section.year || 1}
              />
            </label>
            <button className="button primary">Save section</button>
          </form>
        </Modal>
      )}
    </>
  );
}
