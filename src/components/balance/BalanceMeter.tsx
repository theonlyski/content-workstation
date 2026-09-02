import { PILLAR_CONFIG, JOB_CONFIG, TARGET_MONTHLY_BALANCE, type Pillar, type Job } from '../../types';
import { usePoolStats, usePlanStats } from '../../store/boardStore';

interface BalanceMeterProps {
  context: 'pool' | 'plan';
}

export function BalanceMeter({ context }: BalanceMeterProps) {
  const poolStats = usePoolStats();
  const planStats = usePlanStats();
  const stats = context === 'pool' ? poolStats : planStats;
  const { pillarCounts, jobCounts, total } = stats;

  const pillarPercentages = Object.entries(pillarCounts).reduce((acc, [key, count]) => {
    acc[key as Pillar] = total > 0 ? ((count as number) / total) * 100 : 0;
    return acc;
  }, {} as Record<Pillar, number>);

  const jobPercentages = Object.entries(jobCounts).reduce((acc, [key, count]) => {
    acc[key as Job] = total > 0 ? ((count as number) / total) * 100 : 0;
    return acc;
  }, {} as Record<Job, number>);

  const targetPercentages = {
    authority: TARGET_MONTHLY_BALANCE.authority * 100,
    engagement: TARGET_MONTHLY_BALANCE.engagement * 100,
    growth: TARGET_MONTHLY_BALANCE.growth * 100,
    soft_sales: TARGET_MONTHLY_BALANCE.soft_sales * 100,
  };

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 font-mono text-sm uppercase tracking-wider text-[var(--color-accent)]">
        Balance {context === 'pool' ? '(Pool)' : '(Plan)'}
      </h3>

      {/* Pillar distribution */}
      <div className="mb-4">
        <div className="mb-2 text-xs text-gray-400">Pillars</div>
        <div className="flex h-2 overflow-hidden rounded-sm">
          {(Object.entries(pillarPercentages) as [Pillar, number][]).map(([pillar, pct]) => (
            <div
              key={pillar}
              className="transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: PILLAR_CONFIG[pillar].color,
              }}
              title={`${PILLAR_CONFIG[pillar].label}: ${pct.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          {(Object.entries(pillarPercentages) as [Pillar, number][]).map(([pillar, pct]) => (
            <div key={pillar} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PILLAR_CONFIG[pillar].color }}
              />
              <span className="text-gray-400">{PILLAR_CONFIG[pillar].emoji}</span>
              <span className="text-gray-300">{pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Job distribution */}
      <div>
        <div className="mb-2 text-xs text-gray-400">Jobs vs Target</div>
        <div className="space-y-2">
          {(Object.entries(jobPercentages) as [Job, number][]).map(([job, pct]) => {
            const target = targetPercentages[job];
            const diff = pct - target;
            const isOver = diff > 5;
            const isUnder = diff < -5;

            return (
              <div key={job}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-gray-300">{JOB_CONFIG[job].label}</span>
                  <span className="font-mono text-gray-400">
                    {pct.toFixed(0)}% / {target.toFixed(0)}%
                  </span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-sm bg-[var(--color-base)]">
                  <div
                    className="transition-all duration-300"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: isOver
                        ? '#ef4444'
                        : isUnder
                        ? '#f59e0b'
                        : 'var(--color-accent)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total count */}
      <div className="mt-4 border-t border-[var(--color-border)] pt-3 text-center">
        <div className="font-mono text-2xl text-[var(--color-accent)]">{total}</div>
        <div className="text-xs text-gray-400">
          {context === 'pool' ? 'classified ideas in pool' : 'ideas scheduled'}
        </div>
        {context === 'pool' && 'unclassified' in stats && (stats as typeof poolStats).unclassified > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            + {(stats as typeof poolStats).unclassified} unclassified
          </div>
        )}
      </div>
    </div>
  );
}
