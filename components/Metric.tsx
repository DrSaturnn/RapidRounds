type MetricProps = {
  label: string;
  value: string | number;
};

export function Metric({ label, value }: MetricProps) {
  return (
    <div className="rr-card px-4 py-5 sm:px-5">
      <p className="rr-meta">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
