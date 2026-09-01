import { useState } from 'react';
import { PILLAR_CONFIG, JOB_CONFIG, type Pillar, type Job } from '../../types';
import { useBoardStore } from '../../store/boardStore';
import { generateIdea } from '../../lib/ai';

export function Generator() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedPillar, setSelectedPillar] = useState<Pillar>('internal_power');
  const [selectedJob, setSelectedJob] = useState<Job>('authority');
  const [isGenerating, setIsGenerating] = useState(false);

  const currentBoard = useBoardStore(state => state.currentBoard);
  const updateIdea = useBoardStore(state => state.updateIdea);

  const handleGenerate = async () => {
    if (!currentBoard) return;
    
    const idea = currentBoard.ideas.find(i => i.day === selectedDay);
    if (!idea) return;

    setIsGenerating(true);
    try {
      const seedIdea = await generateIdea(selectedPillar, selectedJob);
      await updateIdea(idea.id, {
        seedIdea,
        pillar: selectedPillar,
        job: selectedJob,
      });
    } catch (error) {
      console.error('Failed to generate idea:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 font-mono text-sm uppercase tracking-wider text-[var(--color-accent)]">
        Generator
      </h3>

      <div className="space-y-3">
        {/* Day selector */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Day</label>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-gray-200 focus:border-[var(--color-accent)] focus:outline-none"
          >
            {Array.from({ length: 30 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Day {i + 1}</option>
            ))}
          </select>
        </div>

        {/* Pillar selector */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Pillar</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(PILLAR_CONFIG) as [Pillar, typeof PILLAR_CONFIG[Pillar]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedPillar(key)}
                className="rounded-sm border px-2 py-1.5 text-xs transition-all"
                style={{
                  borderColor: selectedPillar === key ? config.color : 'var(--color-border)',
                  backgroundColor: selectedPillar === key ? `${config.color}20` : 'transparent',
                  color: selectedPillar === key ? config.color : 'var(--color-text)',
                }}
              >
                {config.emoji} {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Job selector */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Job</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(JOB_CONFIG) as [Job, typeof JOB_CONFIG[Job]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedJob(key)}
                className="rounded-sm border border-[var(--color-border)] px-2 py-1.5 text-xs transition-all hover:border-[var(--color-accent)]"
                style={{
                  borderColor: selectedJob === key ? 'var(--color-accent)' : undefined,
                  backgroundColor: selectedJob === key ? 'rgba(6, 182, 212, 0.1)' : undefined,
                  color: selectedJob === key ? 'var(--color-accent)' : undefined,
                }}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Idea'}
        </button>
      </div>
    </div>
  );
}
