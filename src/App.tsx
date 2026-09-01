import { useEffect, useState } from 'react';
import { BoardGrid } from './components/board/BoardGrid';
import { Generator } from './components/generator/Generator';
import { BalanceMeter } from './components/balance/BalanceMeter';
import { IdeaDetailPanel } from './components/idea/IdeaDetailPanel';
import { IdeaBank } from './components/idea/IdeaBank';
import { useBoardStore } from './store/boardStore';

type ViewMode = 'board' | 'bank';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
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
          {/* Board area */}
          <div>
            {currentBoard ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('board')}
                      className="rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        borderColor: viewMode === 'board' ? 'var(--color-accent)' : 'var(--color-border)',
                        color: viewMode === 'board' ? 'var(--color-accent)' : 'var(--color-text)',
                        backgroundColor: viewMode === 'board' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                      }}
                    >
                      Board
                    </button>
                    <button
                      onClick={() => setViewMode('bank')}
                      className="rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        borderColor: viewMode === 'bank' ? 'var(--color-accent)' : 'var(--color-border)',
                        color: viewMode === 'bank' ? 'var(--color-accent)' : 'var(--color-text)',
                        backgroundColor: viewMode === 'bank' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                      }}
                    >
                      Idea Bank
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {currentBoard.ideas.filter(i => i.seedIdea).length} / 30 ideas
                  </div>
                </div>
                {viewMode === 'board' ? <BoardGrid /> : <IdeaBank />}
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
            <Generator />
            <BalanceMeter />
          </aside>
        </div>
      </main>

      {/* Idea Detail Panel */}
      <IdeaDetailPanel />
    </div>
  );
}

export default App;
