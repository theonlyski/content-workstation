import { useState } from 'react';
import { PILLAR_CONFIG, ANGLE_TYPES, type Idea, type AngleType } from '../../types';
import { useBoardStore } from '../../store/boardStore';
import { generateAngle, generateHooks, generateCaption, generateRepurposed } from '../../lib/ai';

type TabId = 'angle' | 'hooks' | 'caption' | 'repurpose' | 'review';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'angle', label: 'Angle' },
  { id: 'hooks', label: 'Hooks' },
  { id: 'caption', label: 'Caption' },
  { id: 'repurpose', label: 'Repurpose' },
  { id: 'review', label: 'Review' },
];

export function IdeaDetailPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('angle');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const currentBoard = useBoardStore(state => state.currentBoard);
  const selectedIdeaId = useBoardStore(state => state.selectedIdeaId);
  const updateIdea = useBoardStore(state => state.updateIdea);
  const selectIdea = useBoardStore(state => state.selectIdea);

  if (!currentBoard || !selectedIdeaId) return null;

  const idea = currentBoard.ideas.find(i => i.id === selectedIdeaId);
  if (!idea) return null;

  const pillarConfig = PILLAR_CONFIG[idea.pillar];

  const handleGenerateAngle = async () => {
    setIsGenerating('angle');
    try {
      const result = await generateAngle(idea.seedIdea, idea.pillar);
      await updateIdea(idea.id, {
        angle: result.angle,
        angleType: result.angleType,
        stage: 'angled',
      });
    } catch (error) {
      console.error('Failed to generate angle:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateHooks = async (count: number = 5) => {
    setIsGenerating('hooks');
    try {
      const hooks = await generateHooks(idea.seedIdea, idea.angle, count);
      await updateIdea(idea.id, {
        hooks,
        stage: 'hooked',
      });
    } catch (error) {
      console.error('Failed to generate hooks:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateCaption = async () => {
    if (idea.selectedHookIndex === null || !idea.hooks[idea.selectedHookIndex]) return;
    
    setIsGenerating('caption');
    try {
      const selectedHook = idea.hooks[idea.selectedHookIndex];
      const caption = await generateCaption(idea.seedIdea, idea.angle, selectedHook.text);
      await updateIdea(idea.id, {
        caption,
        stage: 'captioned',
      });
    } catch (error) {
      console.error('Failed to generate caption:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateRepurposed = async () => {
    setIsGenerating('repurpose');
    try {
      const selectedHook = idea.hooks[idea.selectedHookIndex || 0];
      const repurposed = await generateRepurposed(
        idea.seedIdea,
        idea.angle,
        selectedHook?.text || '',
        idea.caption
      );
      await updateIdea(idea.id, {
        repurposed,
        stage: 'repurposed',
      });
    } catch (error) {
      console.error('Failed to generate repurposed content:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleReviewChange = (field: keyof Idea['review'], value: boolean) => {
    const newReview = { ...idea.review, [field]: value };
    const allChecked = Object.values(newReview).every(v => v);
    updateIdea(idea.id, {
      review: newReview,
      stage: allChecked ? 'reviewed' : idea.stage,
    });
  };

  return (
    <div className="animate-slide-in fixed right-0 top-0 z-40 flex h-full w-full max-w-2xl flex-col border-l border-[var(--color-border)] bg-[var(--color-base)] shadow-2xl lg:max-w-3xl">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{pillarConfig.emoji}</span>
            <div>
              <div className="font-mono text-xs text-gray-400">Day {idea.day}</div>
              <div className="text-sm font-medium" style={{ color: pillarConfig.color }}>
                {pillarConfig.label}
              </div>
            </div>
          </div>
          <button
            onClick={() => selectIdea(null)}
            className="rounded-sm border border-[var(--color-border)] px-3 py-1 text-sm text-gray-400 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Close
          </button>
        </div>
        
        {idea.seedIdea && (
          <div className="mt-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="text-xs text-gray-400">Seed Idea</div>
            <div className="mt-1 text-sm text-gray-200">{idea.seedIdea}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
            style={{
              borderColor: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'angle' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Angle Type</label>
              <select
                value={idea.angleType}
                onChange={(e) => updateIdea(idea.id, { angleType: e.target.value as AngleType })}
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-200"
              >
                <option value="">Select angle type...</option>
                {ANGLE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">Angle</label>
              <textarea
                value={idea.angle}
                onChange={(e) => updateIdea(idea.id, { angle: e.target.value })}
                rows={6}
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-200"
                placeholder="The specific angle for this post..."
              />
            </div>

            <button
              onClick={handleGenerateAngle}
              disabled={isGenerating === 'angle' || !idea.seedIdea}
              className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
            >
              {isGenerating === 'angle' ? 'Generating...' : 'Generate Angle'}
            </button>
          </div>
        )}

        {activeTab === 'hooks' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleGenerateHooks(5)}
                disabled={isGenerating === 'hooks' || !idea.angle}
                className="flex-1 rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
              >
                {isGenerating === 'hooks' ? 'Generating...' : 'Generate 5 Hooks'}
              </button>
              <button
                onClick={() => handleGenerateHooks(15)}
                disabled={isGenerating === 'hooks' || !idea.angle}
                className="rounded-sm border border-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition-all hover:bg-[var(--color-accent)]/10 disabled:opacity-50"
              >
                15
              </button>
            </div>

            {idea.hooks.length > 0 && (
              <div className="space-y-2">
                {idea.hooks.map((hook, idx) => (
                  <div
                    key={idx}
                    className="rounded-sm border p-3 transition-all"
                    style={{
                      borderColor: idea.selectedHookIndex === idx ? 'var(--color-accent)' : 'var(--color-border)',
                      backgroundColor: idea.selectedHookIndex === idx ? 'rgba(6, 182, 212, 0.05)' : 'var(--color-surface)',
                    }}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <textarea
                        value={hook.text}
                        onChange={(e) => {
                          const newHooks = [...idea.hooks];
                          newHooks[idx] = { ...newHooks[idx], text: e.target.value };
                          updateIdea(idea.id, { hooks: newHooks });
                        }}
                        rows={2}
                        className="flex-1 resize-none bg-transparent text-sm text-gray-200 focus:outline-none"
                      />
                      <button
                        onClick={() => updateIdea(idea.id, { selectedHookIndex: idx })}
                        className="rounded-sm border px-2 py-1 text-xs transition-colors"
                        style={{
                          borderColor: idea.selectedHookIndex === idx ? 'var(--color-accent)' : 'var(--color-border)',
                          color: idea.selectedHookIndex === idx ? 'var(--color-accent)' : 'var(--color-text)',
                        }}
                      >
                        {idea.selectedHookIndex === idx ? 'Selected' : 'Select'}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">{hook.style}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'caption' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Caption</label>
              <textarea
                value={idea.caption}
                onChange={(e) => updateIdea(idea.id, { caption: e.target.value })}
                rows={12}
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-200"
                placeholder="Your caption here..."
              />
            </div>

            <button
              onClick={handleGenerateCaption}
              disabled={isGenerating === 'caption' || idea.selectedHookIndex === null}
              className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
            >
              {isGenerating === 'caption' ? 'Generating...' : 'Generate Caption'}
            </button>
          </div>
        )}

        {activeTab === 'repurpose' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Video Script (Reel/TikTok)</label>
              <textarea
                value={idea.repurposed.videoScript}
                onChange={(e) => updateIdea(idea.id, { repurposed: { ...idea.repurposed, videoScript: e.target.value } })}
                rows={8}
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-200"
                placeholder="Hook + beats + CTA + on-screen text cues..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">Carousel Outline</label>
              <textarea
                value={idea.repurposed.carouselOutline}
                onChange={(e) => updateIdea(idea.id, { repurposed: { ...idea.repurposed, carouselOutline: e.target.value } })}
                rows={6}
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-200"
                placeholder="Slide-by-slide outline..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">Alt Caption</label>
              <textarea
                value={idea.repurposed.altCaption}
                onChange={(e) => updateIdea(idea.id, { repurposed: { ...idea.repurposed, altCaption: e.target.value } })}
                rows={4}
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-200"
                placeholder="Platform-variant caption..."
              />
            </div>

            <button
              onClick={handleGenerateRepurposed}
              disabled={isGenerating === 'repurpose' || !idea.caption}
              className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
            >
              {isGenerating === 'repurpose' ? 'Generating...' : 'Generate All Repurposed Content'}
            </button>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {[
                { key: 'hookStrength' as const, label: 'Hook is strong and curiosity-driven' },
                { key: 'ctaClear' as const, label: 'CTA is clear and compelling' },
                { key: 'saveWorthy' as const, label: 'Content is save-worthy (provides real value)' },
                { key: 'standsAlone' as const, label: 'Post stands alone as a complete piece' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <input
                    type="checkbox"
                    checked={idea.review[key]}
                    onChange={(e) => handleReviewChange(key, e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <span className="text-sm text-gray-200">{label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">Notes</label>
              <textarea
                value={idea.notes}
                onChange={(e) => updateIdea(idea.id, { notes: e.target.value })}
                rows={4}
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-200"
                placeholder="Additional notes..."
              />
            </div>

            {Object.values(idea.review).every(v => v) && (
              <div className="rounded-sm border border-green-500/30 bg-green-500/10 p-3 text-center text-sm text-green-400">
                ✓ All checks passed — ready to publish
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
