import { useState } from 'react';
import { PILLAR_CONFIG, JOB_CONFIG, STAGE_ORDER, type Pillar, type Job, type Stage } from '../../types';
import { useBoardStore } from '../../store/boardStore';

export function IdeaBank() {
  const [filterPillar, setFilterPillar] = useState<Pillar | 'all'>('all');
  const [filterJob, setFilterJob] = useState<Job | 'all'>('all');
  const [filterStage, setFilterStage] = useState<Stage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentBoard = useBoardStore(state => state.currentBoard);
  const selectIdea = useBoardStore(state => state.selectIdea);

  if (!currentBoard) return null;

  const filteredIdeas = currentBoard.ideas
    .filter(idea => {
      if (!idea.seedIdea) return false;
      if (filterPillar !== 'all' && idea.pillar !== filterPillar) return false;
      if (filterJob !== 'all' && idea.job !== filterJob) return false;
      if (filterStage !== 'all' && idea.stage !== filterStage) return false;
      if (searchQuery && !idea.seedIdea.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => a.day - b.day);

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] p-4">
        <h3 className="mb-3 font-mono text-sm uppercase tracking-wider text-[var(--color-accent)]">
          Idea Bank
        </h3>

        {/* Filters */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-[var(--color-accent)] focus:outline-none"
          />

          <div className="grid grid-cols-3 gap-2">
            <select
              value={filterPillar}
              onChange={(e) => setFilterPillar(e.target.value as Pillar | 'all')}
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-base)] px-2 py-1.5 text-xs text-gray-200"
            >
              <option value="all">All Pillars</option>
              {(Object.entries(PILLAR_CONFIG) as [Pillar, typeof PILLAR_CONFIG[Pillar]][]).map(([key, config]) => (
                <option key={key} value={key}>{config.emoji} {config.label}</option>
              ))}
            </select>

            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value as Job | 'all')}
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-base)] px-2 py-1.5 text-xs text-gray-200"
            >
              <option value="all">All Jobs</option>
              {(Object.entries(JOB_CONFIG) as [Job, typeof JOB_CONFIG[Job]][]).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as Stage | 'all')}
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-base)] px-2 py-1.5 text-xs text-gray-200"
            >
              <option value="all">All Stages</option>
              {STAGE_ORDER.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ideas list */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredIdeas.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No ideas match your filters
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredIdeas.map(idea => {
              const pillarConfig = PILLAR_CONFIG[idea.pillar];
              return (
                <button
                  key={idea.id}
                  onClick={() => selectIdea(idea.id)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-base)]"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">Day {idea.day}</span>
                    <span className="text-xs">{pillarConfig.emoji}</span>
                    <span className="text-xs text-gray-400">{idea.stage}</span>
                  </div>
                  <div className="text-sm text-gray-200 line-clamp-2">{idea.seedIdea}</div>
                  {idea.angle && (
                    <div className="mt-1 text-xs text-gray-500 line-clamp-1">{idea.angle}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-3 text-center text-xs text-gray-500">
        {filteredIdeas.length} of {currentBoard.ideas.filter(i => i.seedIdea).length} ideas
      </div>
    </div>
  );
}
