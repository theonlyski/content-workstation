import { useState } from 'react';
import { useBoardStore } from '../../store/boardStore';

interface DayPickerModalProps {
  ideaId: string;
  onClose: () => void;
}

export function DayPickerModal({ ideaId, onClose }: DayPickerModalProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const currentBoard = useBoardStore(state => state.currentBoard);
  const sendToPlan = useBoardStore(state => state.sendToPlan);

  if (!currentBoard) return null;

  // Find which days are already taken
  const scheduledDays = new Set(
    currentBoard.ideas
      .filter(i => i.day !== null && i.id !== ideaId)
      .map(i => i.day as number)
  );

  const handleConfirm = async () => {
    if (selectedDay === null) return;
    await sendToPlan(ideaId, selectedDay);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 font-mono text-sm uppercase tracking-wider text-[var(--color-accent)]">
          Send to Plan
        </h3>
        
        <p className="mb-4 text-sm text-gray-400">
          Select a day (1-30) to schedule this idea:
        </p>

        <div className="mb-4 grid grid-cols-6 gap-2">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
            const isTaken = scheduledDays.has(day);
            const isSelected = selectedDay === day;
            
            return (
              <button
                key={day}
                onClick={() => !isTaken && setSelectedDay(day)}
                disabled={isTaken}
                className="aspect-square rounded-sm border text-sm font-medium transition-all"
                style={{
                  borderColor: isSelected
                    ? 'var(--color-accent)'
                    : isTaken
                    ? 'var(--color-border)'
                    : 'var(--color-border)',
                  backgroundColor: isSelected
                    ? 'var(--color-accent)'
                    : isTaken
                    ? 'var(--color-base)'
                    : 'transparent',
                  color: isSelected
                    ? 'var(--color-base)'
                    : isTaken
                    ? 'var(--color-border)'
                    : 'var(--color-text)',
                  opacity: isTaken ? 0.4 : 1,
                  cursor: isTaken ? 'not-allowed' : 'pointer',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <p className="mb-4 text-xs text-gray-400">
            Selected: Day {selectedDay}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-[var(--color-border)] px-4 py-2 text-sm text-gray-400 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedDay === null}
            className="flex-1 rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
