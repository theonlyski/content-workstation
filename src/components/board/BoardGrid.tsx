import { IdeaTile } from './IdeaTile';
import { useBoardStore } from '../../store/boardStore';

export function BoardGrid() {
  const currentBoard = useBoardStore(state => state.currentBoard);

  if (!currentBoard) {
    return (
      <div className="flex h-64 items-center justify-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-gray-500">No board loaded. Create or select a month.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2 sm:gap-3">
      {currentBoard.ideas.map(idea => (
        <IdeaTile key={idea.id} idea={idea} />
      ))}
    </div>
  );
}
