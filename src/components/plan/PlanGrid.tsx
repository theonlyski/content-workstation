import { IdeaTile } from '../board/IdeaTile';
import { useBoardStore } from '../../store/boardStore';

export function PlanGrid() {
  const currentBoard = useBoardStore(state => state.currentBoard);

  if (!currentBoard) {
    return (
      <div className="flex h-64 items-center justify-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-gray-500">No board loaded. Create or select a month.</p>
      </div>
    );
  }

  // Create a map of scheduled ideas by day
  const ideasByDay = new Map<number, typeof currentBoard.ideas[0]>();
  currentBoard.ideas.forEach(idea => {
    if (idea.day !== null) {
      ideasByDay.set(idea.day, idea);
    }
  });

  // Generate all 30 days, with empty slots for unscheduled days
  const allDays = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    return ideasByDay.get(day) || null;
  });

  return (
    <div className="grid grid-cols-7 gap-2 sm:gap-3">
      {allDays.map((idea, index) => {
        const day = index + 1;
        
        if (!idea) {
          // Empty slot
          return (
            <div
              key={day}
              className="relative aspect-square rounded-sm border border-dashed border-[var(--color-border)] bg-[var(--color-base)]"
            >
              <div className="absolute top-1.5 left-2 font-mono text-xs text-gray-600">
                {day}
              </div>
              <div className="flex h-full items-center justify-center">
                <div className="text-xl text-gray-700">+</div>
              </div>
            </div>
          );
        }

        return <IdeaTile key={idea.id} idea={idea} context="plan" />;
      })}
    </div>
  );
}
