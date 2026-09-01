import { useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { createEmptyIdea } from '../../lib/db';

export function QuickCapture() {
  const [text, setText] = useState('');
  const currentBoard = useBoardStore(state => state.currentBoard);
  const addIdeaToPool = useBoardStore(state => state.addIdeaToPool);

  const handleAdd = async () => {
    if (!text.trim() || !currentBoard) return;

    const newIdea = createEmptyIdea();
    newIdea.seedIdea = text.trim();
    
    await addIdeaToPool(newIdea);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick capture — type a raw thought, hit Enter..."
          disabled={!currentBoard}
          className="flex-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleAdd}
          disabled={!text.trim() || !currentBoard}
          className="rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {!currentBoard && (
        <p className="mt-2 text-xs text-gray-500">Create a board first</p>
      )}
    </div>
  );
}
