export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rr-empty">
      <h2 className="rr-section-title">{title}</h2>
      <p className="rr-supporting mt-2 max-w-xl">{body}</p>
    </div>
  );
}
