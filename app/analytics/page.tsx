import { EmptyState } from "@/components/EmptyState";
import { Metric } from "@/components/Metric";
import { formatResponseTime, getAnalyticsStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analytics = await getAnalyticsStats();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-4xl font-semibold tracking-normal">Analytics</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
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
    <section>
      <div className="border-b border-black pb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="divide-y divide-black">
          {rows.map((row) => (
            <div key={row.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
              <p className="font-medium">{row.primary}</p>
              <p className="text-sm text-neutral-600">{row.secondary}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
