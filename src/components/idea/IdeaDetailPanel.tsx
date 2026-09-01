import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PILLAR_CONFIG, JOB_CONFIG, ANGLE_TYPES, type Idea, type Pillar, type Job, type AngleCandidate } from '../../types';
import { useBoardStore } from '../../store/boardStore';
import { useStyleProfileStore } from '../../store/styleProfileStore';
import { generateAnglesAndClassify, generateHookCaption, generateRepurposed } from '../../lib/ai';
import { styleProfileToPromptText } from '../../lib/styleProfile';

type TabId = 'angle' | 'hook_caption' | 'repurpose' | 'review';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'angle', label: 'Angle' },
  { id: 'hook_caption', label: 'Hook & Caption' },
  { id: 'repurpose', label: 'Repurpose' },
  { id: 'review', label: 'Review' },
];

export function IdeaDetailPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('angle');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [checkedAngles, setCheckedAngles] = useState<Set<number>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  const currentBoard = useBoardStore(state => state.currentBoard);
  const selectedIdeaId = useBoardStore(state => state.selectedIdeaId);
  const updateIdea = useBoardStore(state => state.updateIdea);
  const selectIdea = useBoardStore(state => state.selectIdea);
  const spinoffIdea = useBoardStore(state => state.spinoffIdea);
  const styleProfile = useStyleProfileStore(state => state.profile);
  const styleProfileText = styleProfile ? styleProfileToPromptText(styleProfile) : undefined;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectIdea(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectIdea]);

  if (!currentBoard || !selectedIdeaId) return null;

  const idea = currentBoard.ideas.find(i => i.id === selectedIdeaId);
  if (!idea) return null;

  // Safety: ensure new fields exist (migration for old data)
  if (!idea.angleCandidates) idea.angleCandidates = [];
  if (idea.selectedAngleIndex === undefined) idea.selectedAngleIndex = null;
  if (!idea.hookCaption) idea.hookCaption = { text: '', history: [], feedback: null };
  if (!idea.repurposed) idea.repurposed = { videoScript: '', carouselOutline: '', altCaption: '' };
  if (!idea.review) idea.review = { hookStrength: false, ctaClear: false, saveWorthy: false, standsAlone: false };
  if (idea.parentIdeaId === undefined) idea.parentIdeaId = null;
  if (!idea.pillarSource) idea.pillarSource = 'ai';
  if (!idea.jobSource) idea.jobSource = 'ai';
  // Migrate old angle candidates to have kept/spawnedIdeaId
  idea.angleCandidates = idea.angleCandidates.map(a => ({
    ...a,
    kept: a.kept ?? false,
    spawnedIdeaId: a.spawnedIdeaId ?? null,
  }));

  const isUnclassified = idea.pillar === null;
  const pillarConfig = idea.pillar ? PILLAR_CONFIG[idea.pillar] : null;
  const selectedAngle = idea.selectedAngleIndex !== null
    ? idea.angleCandidates[idea.selectedAngleIndex]
    : null;

  const handleGenerateAngles = async () => {
    setIsGenerating('angles');
    try {
      const result = await generateAnglesAndClassify(idea.seedIdea, 6, styleProfileText);
      const newCandidates: AngleCandidate[] = result.angles.map(a => ({
        ...a,
        kept: false,
        spawnedIdeaId: null,
      }));
      await updateIdea(idea.id, {
        angleCandidates: [...idea.angleCandidates, ...newCandidates],
        selectedAngleIndex: idea.selectedAngleIndex ?? (newCandidates.length > 0 ? idea.angleCandidates.length : null),
        pillar: result.pillar,
        pillarSource: 'ai',
        job: result.job,
        jobSource: 'ai',
        stage: newCandidates.length > 0 ? 'angled' : idea.stage,
      });
    } catch (error) {
      console.error('Failed to generate angles:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleToggleAngleCheck = (index: number) => {
    const newChecked = new Set(checkedAngles);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedAngles(newChecked);
  };

  const handleKeepSelected = async () => {
    if (checkedAngles.size === 0) return;
    
    const indices = Array.from(checkedAngles).sort((a, b) => a - b);
    const firstIndex = indices[0];
    
    // Update candidates with kept status
    const updatedCandidates = idea.angleCandidates.map((c, i) => ({
      ...c,
      kept: checkedAngles.has(i) ? true : c.kept,
    }));

    // First kept becomes selectedAngleIndex
    // Additional kept ones spin off into new ideas
    const updates: Partial<Idea> = {
      angleCandidates: updatedCandidates,
      selectedAngleIndex: firstIndex,
    };

    await updateIdea(idea.id, updates);

    // Spin off additional kept candidates
    for (let i = 1; i < indices.length; i++) {
      const candidate = idea.angleCandidates[indices[i]];
      if (candidate) {
        await spinoffIdea(idea.id, candidate.text, candidate.angleType);
      }
    }

    setCheckedAngles(new Set());
  };

  const handleGenerateHookCaption = async () => {
    if (!selectedAngle) return;
    setIsGenerating('hook_caption');
    try {
      const newText = await generateHookCaption(idea.seedIdea, selectedAngle.text, styleProfileText);
      const history = idea.hookCaption.text 
        ? [...idea.hookCaption.history, idea.hookCaption.text]
        : idea.hookCaption.history;
      await updateIdea(idea.id, {
        hookCaption: {
          text: newText,
          history,
          feedback: null,
        },
        stage: 'hook_captioned',
      });
    } catch (error) {
      console.error('Failed to generate hook+caption:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleRestoreHistory = (index: number) => {
    const oldText = idea.hookCaption.history[index];
    const newHistory = [...idea.hookCaption.history];
    newHistory.splice(index, 1);
    if (idea.hookCaption.text) {
      newHistory.push(idea.hookCaption.text);
    }
    updateIdea(idea.id, {
      hookCaption: {
        text: oldText,
        history: newHistory,
        feedback: null,
      },
    });
  };

  const handleGenerateRepurposed = async () => {
    if (!idea.hookCaption.text) return;
    setIsGenerating('repurpose');
    try {
      const repurposed = await generateRepurposed(
        idea.seedIdea,
        selectedAngle?.text || '',
        idea.hookCaption.text
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

  const handleFeedback = (feedback: 'up' | 'down' | null) => {
    updateIdea(idea.id, {
      hookCaption: {
        ...idea.hookCaption,
        feedback: idea.hookCaption.feedback === feedback ? null : feedback,
      },
    });
  };

  const handlePillarChange = (pillar: Pillar) => {
    updateIdea(idea.id, {
      pillar,
      pillarSource: 'manual',
    });
  };

  const handleJobChange = (job: Job) => {
    updateIdea(idea.id, {
      job,
      jobSource: 'manual',
    });
  };

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) selectIdea(null); }}
      className="fixed inset-0 z-40 flex justify-end bg-black/50"
    >
    <div ref={panelRef} className="animate-slide-in flex h-full w-full max-w-2xl flex-col border-l border-[var(--color-border)] bg-[var(--color-base)] shadow-2xl lg:max-w-3xl">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isUnclassified ? (
              <span className="text-2xl">⚪</span>
            ) : (
              <span className="text-2xl">{pillarConfig!.emoji}</span>
            )}
            <div>
              <div className="font-mono text-xs text-gray-400">
                {idea.day !== null ? `Day ${idea.day}` : 'Pool'}
              </div>
              <div className="text-sm font-medium" style={{ color: pillarConfig?.color || 'var(--color-text)' }}>
                {isUnclassified ? 'Unclassified' : pillarConfig!.label}
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

        {/* Manual pillar/job override */}
        <div className="mt-3 flex gap-2">
          <select
            value={idea.pillar || ''}
            onChange={(e) => handlePillarChange(e.target.value as Pillar)}
            className="flex-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-gray-200"
          >
            <option value="">Pillar: unclassified</option>
            {(Object.entries(PILLAR_CONFIG) as [Pillar, typeof PILLAR_CONFIG[Pillar]][]).map(([key, config]) => (
              <option key={key} value={key}>{config.emoji} {config.label}</option>
            ))}
          </select>
          <select
            value={idea.job || ''}
            onChange={(e) => handleJobChange(e.target.value as Job)}
            className="flex-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-gray-200"
          >
            <option value="">Job: unclassified</option>
            {(Object.entries(JOB_CONFIG) as [Job, typeof JOB_CONFIG[Job]][]).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        {(idea.pillarSource === 'manual' || idea.jobSource === 'manual') && (
          <div className="mt-1 text-xs text-amber-400">
            Manually overridden
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
            <button
              onClick={handleGenerateAngles}
              disabled={isGenerating === 'angles' || !idea.seedIdea}
              className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
            >
              {isGenerating === 'angles'
                ? 'Generating angles + classifying...'
                : idea.angleCandidates.length > 0
                ? 'Generate More Angles'
                : 'Generate Angles'}
            </button>

            {idea.angleCandidates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {idea.angleCandidates.length} angle candidates — check any to keep
                  </div>
                  {checkedAngles.size > 0 && (
                    <button
                      onClick={handleKeepSelected}
                      className="rounded-sm border border-green-500 bg-green-500/20 px-3 py-1 text-xs text-green-400 hover:bg-green-500/30"
                    >
                      Keep {checkedAngles.size} selected
                    </button>
                  )}
                </div>
                {idea.angleCandidates.map((candidate, idx) => {
                  const isChecked = checkedAngles.has(idx);
                  const angleTypeLabel = ANGLE_TYPES.find(t => t.value === candidate.angleType)?.label || candidate.angleType;
                  
                  return (
                    <div
                      key={idx}
                      className="rounded-sm border p-3 transition-all"
                      style={{
                        borderColor: candidate.kept ? 'var(--color-accent)' : isChecked ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: candidate.kept ? 'rgba(6, 182, 212, 0.1)' : isChecked ? 'rgba(6, 182, 212, 0.05)' : 'var(--color-surface)',
                      }}
                    >
                      <div className="mb-2 flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAngleCheck(idx)}
                          className="mt-1 h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                        />
                        <div className="flex-1">
                          <div className="mb-1 text-xs text-gray-500">{angleTypeLabel}</div>
                          <div className="text-sm text-gray-200">{candidate.text}</div>
                          {candidate.kept && (
                            <div className="mt-1 text-xs text-[var(--color-accent)]">✓ Kept</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'hook_caption' && (
          <div className="space-y-4">
            {!selectedAngle && (
              <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                Select an angle first (Angle tab)
              </div>
            )}

            <button
              onClick={handleGenerateHookCaption}
              disabled={isGenerating === 'hook_caption' || !selectedAngle}
              className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
            >
              {isGenerating === 'hook_caption'
                ? 'Generating...'
                : idea.hookCaption.text
                ? 'Regenerate Hook & Caption'
                : 'Generate Hook & Caption'}
            </button>

            {idea.hookCaption.text && (
              <div>
                <label className="mb-1 block text-xs text-gray-400">Current Hook & Caption</label>
                <textarea
                  value={idea.hookCaption.text}
                  onChange={(e) => updateIdea(idea.id, { hookCaption: { ...idea.hookCaption, text: e.target.value } })}
                  rows={12}
                  className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-gray-200"
                />
              </div>
            )}

            {idea.hookCaption.history.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-gray-400">History (click to restore)</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {idea.hookCaption.history.map((text, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRestoreHistory(idx)}
                      className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-base)] p-2 text-left text-xs text-gray-400 hover:border-[var(--color-accent)] hover:text-gray-200"
                    >
                      <div className="mb-1 text-gray-500">Version {idx + 1}</div>
                      <div className="line-clamp-2">{text}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              disabled={isGenerating === 'repurpose' || !idea.hookCaption.text}
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

            {/* Hook+Caption feedback */}
            {idea.hookCaption.text && (
              <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="mb-2 text-xs text-gray-400">How's this hook+caption?</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFeedback('up')}
                    className="flex-1 rounded-sm border px-3 py-2 text-sm transition-colors"
                    style={{
                      borderColor: idea.hookCaption.feedback === 'up' ? '#10b981' : 'var(--color-border)',
                      backgroundColor: idea.hookCaption.feedback === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      color: idea.hookCaption.feedback === 'up' ? '#10b981' : 'var(--color-text)',
                    }}
                  >
                    👍 Good
                  </button>
                  <button
                    onClick={() => handleFeedback('down')}
                    className="flex-1 rounded-sm border px-3 py-2 text-sm transition-colors"
                    style={{
                      borderColor: idea.hookCaption.feedback === 'down' ? '#ef4444' : 'var(--color-border)',
                      backgroundColor: idea.hookCaption.feedback === 'down' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                      color: idea.hookCaption.feedback === 'down' ? '#ef4444' : 'var(--color-text)',
                    }}
                  >
                    👎 Not quite
                  </button>
                </div>
              </div>
            )}

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
    </div>,
    document.body
  );
}
