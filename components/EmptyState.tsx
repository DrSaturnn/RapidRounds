export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-black py-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">{body}</p>
    </div>
  );
}
