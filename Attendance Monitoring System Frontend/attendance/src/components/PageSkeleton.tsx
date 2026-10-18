export function PageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-label="Loading page">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton skeleton-stat" key={n} />
        ))}
      </div>
      <div className="skeleton skeleton-chart" />
      <span className="sr-only">Loading campus records…</span>
    </div>
  );
}
