import { useEffect } from 'react';
import { useStyleProfileStore } from '../../store/styleProfileStore';
import { styleProfileToPromptText } from '../../lib/styleProfile';
import { ANGLE_TYPES, PILLAR_CONFIG, JOB_CONFIG } from '../../types';

interface StyleProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StyleProfilePanel({ isOpen, onClose }: StyleProfilePanelProps) {
  const { profile, isLoading, refreshProfile, clearProfile } = useStyleProfileStore();

  useEffect(() => {
    if (isOpen && !profile) {
      refreshProfile();
    }
  }, [isOpen, profile, refreshProfile]);

  if (!isOpen) return null;

  const promptText = profile ? styleProfileToPromptText(profile) : '';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-2xl rounded-sm border border-[var(--color-border)] bg-[var(--color-base)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-lg uppercase tracking-wider text-[var(--color-accent)]">
            Style Profile
          </h2>
          <button
            onClick={onClose}
            className="rounded-sm border border-[var(--color-border)] px-3 py-1 text-sm text-gray-400 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Close
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-400">
          This profile is automatically built from your feedback and usage patterns. 
          It gets injected into AI generation prompts to personalize output to your voice.
        </p>

        {isLoading ? (
          <div className="py-8 text-center text-gray-400">Computing profile...</div>
        ) : !profile ? (
          <div className="py-8 text-center text-gray-500">
            No profile yet. Generate some angles and give feedback to build your profile.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preferred angle types */}
            {profile.preferredAngleTypes.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Preferred Angle Types</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.preferredAngleTypes.map(type => {
                    const label = ANGLE_TYPES.find(t => t.value === type)?.label || type;
                    return (
                      <span key={type} className="rounded-sm border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Avoided angle types */}
            {profile.avoidedAngleTypes.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Avoided Angle Types</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.avoidedAngleTypes.map(type => {
                    const label = ANGLE_TYPES.find(t => t.value === type)?.label || type;
                    return (
                      <span key={type} className="rounded-sm border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strong pillars */}
            {profile.strongPillars.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Strong Pillars</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.strongPillars.map(pillar => {
                    const config = PILLAR_CONFIG[pillar];
                    return (
                      <span key={pillar} className="rounded-sm border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-xs text-[var(--color-accent)]">
                        {config.emoji} {config.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strong jobs */}
            {profile.strongJobs.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Strong Jobs</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.strongJobs.map(job => {
                    const config = JOB_CONFIG[job];
                    return (
                      <span key={job} className="rounded-sm border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-1 text-xs text-[var(--color-accent)]">
                        {config.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tone notes */}
            {profile.toneNotes.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Tone Notes</h3>
                <ul className="space-y-1 text-sm text-gray-400">
                  {profile.toneNotes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Example hook+captions */}
            {profile.exampleHookCaptions.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Example Hook+Captions You Liked</h3>
                <div className="space-y-2">
                  {profile.exampleHookCaptions.map((example, i) => (
                    <div key={i} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs text-gray-400">
                      {example.substring(0, 150)}{example.length > 150 ? '...' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw prompt text */}
            {promptText && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Prompt Injection (what AI sees)</h3>
                <pre className="max-h-40 overflow-y-auto rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-gray-400">
                  {promptText}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => refreshProfile()}
            disabled={isLoading}
            className="flex-1 rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-base)] transition-all hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Profile'}
          </button>
          <button
            onClick={() => {
              if (confirm('Clear your style profile? This cannot be undone.')) {
                clearProfile();
              }
            }}
            className="rounded-sm border border-red-500/50 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
