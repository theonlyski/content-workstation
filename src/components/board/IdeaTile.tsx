import { useState } from 'react';
import { PILLAR_CONFIG, STAGE_ORDER, type Idea } from '../../types';
import { useBoardStore } from '../../store/boardStore';
import { DayPickerModal } from '../plan/DayPickerModal';

interface IdeaTileProps {
  idea: Idea;
  context: 'pool' | 'plan';
}

export function IdeaTile({ idea, context }: IdeaTileProps) {
  const [showDayPicker, setShowDayPicker] = useState(false);
  const selectIdea = useBoardStore(state => state.selectIdea);
  const removeFromPlan = useBoardStore(state => state.removeFromPlan);
  const deleteIdea = useBoardStore(state => state.deleteIdea);
  
  const isUnclassified = idea.pillar === null;
  const pillarConfig = idea.pillar ? PILLAR_CONFIG[idea.pillar] : null;
  const hasContent = idea.seedIdea.length > 0;
  
  const stageIndex = STAGE_ORDER.indexOf(idea.stage);
  const progressSegments = 4; // draft, angled, hook_captioned, repurposed, reviewed
  const filledSegments = Math.max(0, stageIndex);

  const handleTileClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button[data-action]')) {
      return;
    }
    selectIdea(idea.id);
  };

  const borderColor = hasContent
    ? (pillarConfig?.color || 'var(--color-border)')
    : 'var(--color-border)';
  
  const backgroundColor = hasContent
    ? (pillarConfig ? `${pillarConfig.color}10` : 'var(--color-surface)')
    : 'var(--color-surface)';

  return (
    <>
      <div
        onClick={handleTileClick}
        className="relative aspect-square rounded-sm border transition-all duration-200 hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-base)]"
        style={{ borderColor, backgroundColor }}
      >
        {/* Day number (plan context) or Pool/Unclassified badge */}
        <div className="absolute top-1.5 left-2 font-mono text-xs text-gray-500">
          {context === 'plan' && idea.day !== null
            ? idea.day
            : isUnclassified
            ? '⚪'
            : '⚡'}
        </div>

        {/* Pillar emoji */}
        {hasContent && pillarConfig && (
          <div className="absolute top-1 right-1.5 text-sm">
            {pillarConfig.emoji}
          </div>
        )}

        {/* Center content */}
        <div className="flex h-full items-center justify-center">
          {!hasContent ? (
            <div className="text-2xl text-gray-700">+</div>
          ) : (
            <div className="px-2 text-center">
              <div className="text-xs font-medium text-gray-300 line-clamp-3">
                {idea.seedIdea}
              </div>
            </div>
          )}
        </div>

        {/* Stage progress bar at bottom */}
        {hasContent && (
          <div className="absolute bottom-0 left-0 right-0 flex h-1">
            {Array.from({ length: progressSegments }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-[var(--color-base)] last:border-r-0"
                style={{
                  backgroundColor: i < filledSegments
                    ? (pillarConfig?.color || 'var(--color-accent)')
                    : 'transparent',
                  opacity: i < filledSegments ? 1 : 0.2,
                }}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        {hasContent && (
          <div className="absolute bottom-2 right-1.5 flex items-center gap-1">
            {context === 'pool' && idea.selectedAngleIndex !== null && (
              <button
                data-action="send-to-plan"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDayPicker(true);
                }}
                className="h-4 w-4 rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[8px] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/40"
                title="Send to Plan"
              >
                →
              </button>
            )}
            {context === 'plan' && (
              <button
                data-action="remove-from-plan"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromPlan(idea.id);
                }}
                className="h-4 w-4 rounded-sm border border-amber-500/50 bg-amber-500/20 text-[8px] text-amber-400 hover:bg-amber-500/40"
                title="Send back to Pool"
              >
                ←
              </button>
            )}
            <button
              data-action="delete"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this idea?')) deleteIdea(idea.id);
              }}
              className="h-4 w-4 rounded-sm border border-red-500/50 bg-red-500/20 text-[8px] text-red-400 hover:bg-red-500/40"
              title="Delete idea"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {showDayPicker && (
        <DayPickerModal
          ideaId={idea.id}
          onClose={() => setShowDayPicker(false)}
        />
      )}
    </>
  );
}
