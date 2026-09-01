import { PILLAR_CONFIG, STAGE_ORDER, type Idea } from '../../types';
import { useBoardStore } from '../../store/boardStore';

interface IdeaTileProps {
  idea: Idea;
}

export function IdeaTile({ idea }: IdeaTileProps) {
  const selectIdea = useBoardStore(state => state.selectIdea);
  const pillarConfig = PILLAR_CONFIG[idea.pillar];
  const hasContent = idea.seedIdea.length > 0;
  
  const stageIndex = STAGE_ORDER.indexOf(idea.stage);
  const progressSegments = 5;
  const filledSegments = Math.max(0, stageIndex);

  return (
    <button
      onClick={() => selectIdea(idea.id)}
      className="relative aspect-square rounded-sm border transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-base)]"
      style={{
        borderColor: hasContent ? pillarConfig.color : 'var(--color-border)',
        backgroundColor: hasContent ? `${pillarConfig.color}10` : 'var(--color-surface)',
      }}
    >
      {/* Day number */}
      <div className="absolute top-1.5 left-2 font-mono text-xs text-gray-500">
        {idea.day}
      </div>

      {/* Pillar emoji */}
      {hasContent && (
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
                backgroundColor: i < filledSegments ? pillarConfig.color : 'transparent',
                opacity: i < filledSegments ? 1 : 0.2,
              }}
            />
          ))}
        </div>
      )}

      {/* Job badge */}
      {hasContent && (
        <div 
          className="absolute bottom-2 right-1.5 h-2 w-2 rounded-full"
          style={{ backgroundColor: pillarConfig.color }}
          title={idea.job}
        />
      )}
    </button>
  );
}
