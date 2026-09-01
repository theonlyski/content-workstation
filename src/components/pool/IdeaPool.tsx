import { useState } from 'react';
import { PILLAR_CONFIG, JOB_CONFIG, STAGE_ORDER, type Pillar, type Job, type Stage } from '../../types';
import { useBoardStore } from '../../store/boardStore';
import { IdeaTile } from '../board/IdeaTile';

export function IdeaPool() {
  const [filterPillar, setFilterPillar] = useState<Pillar | 'all'>('all');
  const [filterJob, setFilterJob] = useState<Job | 'all'>('all');
  const [filterStage, setFilterStage] = useState<Stage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const currentBoard = useBoardStore(state => state.currentBoard);
  const selectIdea = useBoardStore(state => state.selectIdea);

  if (!currentBoard) return null;

  // Filter pool ideas (day === null)
  const poolIdeas = currentBoard.ideas
    .filter(idea => {
      if (idea.day !== null) return false; // Only show unscheduled ideas
      if (!idea.seedIdea) return false;
      if (filterPillar !== 'all' && idea.pillar !== filterPillar) return false;
      if (filterJob !== 'all' && idea.job !== filterJob) return false;
      if (filterStage !== 'all' && idea.stage !== filterStage) return false;
      if (searchQuery && !idea.seedIdea.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono text-sm uppercase tracking-wider text-[var(--color-accent)]">
            Idea Pool
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className="rounded-sm border px-2 py-1 text-xs transition-colors"
              style={{
                borderColor: viewMode === 'grid' ? 'var(--color-accent)' : 'var(--color-border)',
                color: viewMode === 'grid' ? 'var(--color-accent)' : 'var(--color-text)',
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="rounded-sm border px-2 py-1 text-xs transition-colors"
              style={{
                borderColor: viewMode === 'list' ? 'var(--color-accent)' : 'var(--color-border)',
                color: viewMode === 'list' ? 'var(--color-accent)' : 'var(--color-text)',
              }}
            >
              List
            </button>
          </div>
        </div>

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

      {/* Ideas display */}
      {poolIdeas.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mb-4 text-4xl text-gray-700">⚡</div>
          <p className="mb-2 text-gray-400">
            {currentBoard.ideas.filter(i => i.day === null && i.seedIdea).length === 0
              ? 'No ideas in the pool yet'
              : 'No ideas match your filters'}
          </p>
          <p className="text-xs text-gray-500">
            Use the Generator to create ideas
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {poolIdeas.map(idea => (
            <IdeaTile key={idea.id} idea={idea} context="pool" />
          ))}
        </div>
      ) : (
        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="divide-y divide-[var(--color-border)]">
            {poolIdeas.map(idea => {
              const pillarConfig = PILLAR_CONFIG[idea.pillar];
              return (
                <button
                  key={idea.id}
                  onClick={() => selectIdea(idea.id)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-base)]"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs">{pillarConfig.emoji}</span>
                    <span className="text-xs text-gray-400">{idea.stage}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{JOB_CONFIG[idea.job].label}</span>
                  </div>
                  <div className="text-sm text-gray-200 line-clamp-2">{idea.seedIdea}</div>
                  {idea.angle && (
                    <div className="mt-1 text-xs text-gray-500 line-clamp-1">{idea.angle}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 text-center text-xs text-gray-500">
        {poolIdeas.length} ideas in pool
      </div>
    </div>
  );
}
