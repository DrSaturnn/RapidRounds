import { EmptyState } from "@/components/EmptyState";
import { Metric } from "@/components/Metric";
import { formatResponseTime, getAnalyticsStats } from "@/lib/stats";

// Analytics reads Prisma at request time; keep it out of static prerender.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analytics = await getAnalyticsStats();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="rr-page-title">Analytics</h1>
        <p className="rr-supporting mt-3 max-w-2xl">
          Performance by diagnosis, management decision, and illness script.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <Metric label="Accuracy" value={`${analytics.accuracy}%`} />
        <Metric label="Average response time" value={formatResponseTime(analytics.averageResponseTimeMs)} />
      </section>

      <AnalyticsSection
        title="Most missed diagnoses"
        emptyTitle="No missed diagnoses"
        emptyBody="Misses will appear here after you complete more questions."
        rows={analytics.mostMissedDiagnoses.map((item) => ({
          id: item.label,
          primary: item.label,
          secondary: `${item.misses} misses`
        }))}
      />

      <AnalyticsSection
        title="Weakest management decisions"
        emptyTitle="No management gaps yet"
        emptyBody="Management decisions will rank here once attempts are recorded."
        rows={analytics.weakestManagementDecisions.map((item) => ({
          id: item.label,
          primary: item.label,
          secondary: `${item.accuracy}% accuracy / ${item.attempts} attempts`
        }))}
      />

      <AnalyticsSection
        title="Weakest illness scripts"
        emptyTitle="No illness script gaps yet"
        emptyBody="Patterns will rank here after a few rapid rounds."
        rows={analytics.weakestIllnessScripts.map((item) => ({
          id: item.label,
          primary: item.label,
          secondary: `${item.accuracy}% accuracy / ${item.attempts} attempts`
        }))}
      />
    </div>
  );
}

function AnalyticsSection({
  title,
  emptyTitle,
  emptyBody,
  rows
}: {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  rows: Array<{ id: string; primary: string; secondary: string }>;
}) {
  return (
    <section className="space-y-3">
      <div className="border-b border-rr-soft-line pb-3">
        <h2 className="rr-section-title">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="rr-card divide-y divide-rr-soft-line overflow-hidden">
          {rows.map((row) => (
            <div key={row.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto] sm:px-5">
              <p className="font-medium">{row.primary}</p>
              <p className="rr-meta">{row.secondary}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
