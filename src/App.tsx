import { useEffect, useState } from 'react';
import { PlanGrid } from './components/plan/PlanGrid';
import { IdeaPool } from './components/pool/IdeaPool';
import { BalanceMeter } from './components/balance/BalanceMeter';
import { IdeaDetailPanel } from './components/idea/IdeaDetailPanel';
import { StyleProfilePanel } from './components/settings/StyleProfilePanel';
import { useBoardStore } from './store/boardStore';

type ViewMode = 'pool' | 'plan';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('pool');
  const [showStyleProfile, setShowStyleProfile] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { loadBoard, createNewBoard, currentBoard, isLoading } = useBoardStore();

  useEffect(() => {
    loadBoard(currentMonth);
  }, [currentMonth, loadBoard]);

  const handleCreateNew = async () => {
    if (confirm(`Create a new board for ${currentMonth}? This will overwrite any existing board for this month.`)) {
      await createNewBoard(currentMonth);
    }
  };

  const handleMonthChange = (delta: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  const poolCount = currentBoard?.ideas.filter(i => i.day === null && i.seedIdea).length || 0;
  const planCount = currentBoard?.ideas.filter(i => i.day !== null).length || 0;

  return (
    <div className="hud-bg min-h-screen">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-mono text-xl font-bold tracking-wider text-[var(--color-accent)]">
                CONTENT WORKSTATION
              </h1>
              <p className="mt-0.5 text-xs text-gray-500">30-Day Content Generator</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Style Profile button */}
              <button
                onClick={() => setShowStyleProfile(true)}
                className="rounded-sm border border-[var(--color-border)] px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Style Profile
              </button>

              {/* Month navigator */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMonthChange(-1)}
                  className="rounded-sm border border-[var(--color-border)] px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  ←
                </button>
                <div className="min-w-[120px] text-center">
                  <div className="font-mono text-sm font-medium text-gray-200">{currentMonth}</div>
                </div>
                <button
                  onClick={() => handleMonthChange(1)}
                  className="rounded-sm border border-[var(--color-border)] px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  →
                </button>
              </div>

              {/* Create new button */}
              {!currentBoard && (
                <button
                  onClick={handleCreateNew}
                  disabled={isLoading}
                  className="rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'New Board'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main area */}
          <div>
            {currentBoard ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('pool')}
                      className="rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        borderColor: viewMode === 'pool' ? 'var(--color-accent)' : 'var(--color-border)',
                        color: viewMode === 'pool' ? 'var(--color-accent)' : 'var(--color-text)',
                        backgroundColor: viewMode === 'pool' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                      }}
                    >
                      Idea Pool ({poolCount})
                    </button>
                    <button
                      onClick={() => setViewMode('plan')}
                      className="rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        borderColor: viewMode === 'plan' ? 'var(--color-accent)' : 'var(--color-border)',
                        color: viewMode === 'plan' ? 'var(--color-accent)' : 'var(--color-text)',
                        backgroundColor: viewMode === 'plan' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                      }}
                    >
                      30-Day Plan ({planCount}/30)
                    </button>
                  </div>
                </div>
                {viewMode === 'pool' ? <IdeaPool /> : <PlanGrid />}
              </>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="mb-4 text-4xl text-gray-700">⚡</div>
                <p className="mb-4 text-gray-400">No board for {currentMonth}</p>
                <button
                  onClick={handleCreateNew}
                  disabled={isLoading}
                  className="rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
                >
                  Create New Board
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <BalanceMeter context={viewMode} />
          </aside>
        </div>
      </main>

      {/* Idea Detail Panel */}
      <IdeaDetailPanel />

      {/* Style Profile Panel */}
      <StyleProfilePanel
        isOpen={showStyleProfile}
        onClose={() => setShowStyleProfile(false)}
      />
    </div>
  );
}

export default App;
