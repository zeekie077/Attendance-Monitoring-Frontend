import { X, Search, Inbox, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useId, type ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={`badge ${String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  size = "",
  photo,
}: {
  name: string;
  size?: string;
  photo?: string;
}) {
  if (photo)
    return (
      <img
        className={`avatar ${size}`}
        src={photo}
        alt={`${name}'s profile`}
        style={{ objectFit: "cover" }}
      />
    );
  return (
    <span
      aria-label={name}
      className={`avatar ${size}`}
      style={{
        background: ["#eee9ff", "#e2f3ee", "#e7efff", "#fff0e3"][
          name.length % 4
        ],
        color: ["#7656b8", "#348e78", "#4776b0", "#b3814a"][name.length % 4],
      }}
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current
      ?.querySelector<HTMLElement>("input, select, textarea, button")
      ?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab") return;
      const items = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
        ) || [],
      );
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="modal"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="panel-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.section>
    </div>
  );
}

export function Empty({
  text = "No records found. Try changing your filters.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <p>{text}</p>
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-box">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  icon,
  color = "purple",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${color}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="stat-detail">
        <ArrowUpRight size={14} />
        {detail}
      </div>
    </motion.div>
  );
}
