import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/Button";
import { Metric } from "@/components/Metric";
import { getDashboardStats } from "@/lib/stats";

// Dashboard reads Prisma at request time; keep it out of static prerender.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="rr-page-title">Dashboard</h1>
          <p className="rr-supporting mt-3 max-w-2xl">
            Rapid retrieval for clinical patterns, management calls, and illness scripts.
          </p>
        </div>
        <LinkButton href="/practice">Resume Practice</LinkButton>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        <Metric label="Questions answered today" value={stats.questionsAnsweredToday} />
        <Metric label="Accuracy" value={`${stats.accuracy}%`} />
        <Metric label="Current streak" value={stats.currentStreak} />
      </section>

      <section className="space-y-3">
        <div className="border-b border-rr-soft-line pb-3">
          <h2 className="rr-section-title">Weakest topics</h2>
        </div>
        {stats.weakestTopics.length === 0 ? (
          <EmptyState
            title="No misses yet"
            body="Complete a few rounds and this area will show the topics that need the fastest second pass."
          />
        ) : (
          <div className="rr-card divide-y divide-rr-soft-line overflow-hidden">
            {stats.weakestTopics.map((topic) => (
              <div
                key={`${topic.specialty}-${topic.name}`}
                className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:px-5"
              >
                <div>
                  <p className="font-medium">{topic.name}</p>
                  <p className="rr-meta">{topic.specialty}</p>
                </div>
                <p className="text-sm">{topic.accuracy}% accuracy</p>
                <p className="rr-meta">{topic.attempts} attempts</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
