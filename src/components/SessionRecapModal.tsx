import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Award,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Target,
  AlertTriangle,
  Volume2,
} from 'lucide-react';
import { SessionSummaryData } from '../types.ts';
import { speechService } from '../services/speechService.ts';

interface SessionRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartSession: () => void;
  summary: SessionSummaryData | null;
  loading: boolean;
}

export const SessionRecapModal: React.FC<SessionRecapModalProps> = ({
  isOpen,
  onClose,
  onRestartSession,
  summary,
  loading,
}) => {
  const [copied, setCopied] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!summary) return;
    const text = formatSummaryAsMarkdown(summary);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!summary) return;
    const text = formatSummaryAsMarkdown(summary);
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `german-speaking-session-recap-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePlayAudio = (phrase: string) => {
    setPlayingWord(phrase);
    speechService.speak(phrase, {
      rate: 0.85,
      onEnd: () => setPlayingWord(null),
      onError: () => setPlayingWord(null),
    });
  };

  return (
    <div
      id="session-recap-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="session-recap-card"
        className="relative w-full max-w-3xl bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                Speaking Session Review
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Summary &amp; practice roadmap
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {summary && (
              <>
                <button
                  id="recap-copy-btn"
                  onClick={handleCopy}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 text-xs active:scale-95"
                  title="Copy review to clipboard"
                  aria-label="Copy review to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  id="recap-download-btn"
                  onClick={handleDownload}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 text-xs active:scale-95"
                  title="Download review as Markdown"
                  aria-label="Download review as Markdown"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              </>
            )}
            <button
              id="recap-close-btn"
              onClick={onClose}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close review"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-5 sm:space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-stone-600 dark:text-stone-300 font-medium">
                Analyzing your conversation &amp; preparing your study recap...
              </p>
            </div>
          ) : !summary ? (
            <div className="py-12 text-center text-sm text-stone-500">
              No review data available yet. Have a conversation first!
            </div>
          ) : (
            <>
              {/* Stat badges */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Level: {summary.levelReached || 'A2'}
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 font-medium">
                  {summary.totalTurns} Interactions
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 font-medium">
                  ~{summary.sessionDurationEstimate}
                </div>
              </div>

              {/* 1. New Vocabulary */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  1. New Vocabulary
                </h4>
                {summary.newVocabulary.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">No new words recorded.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {summary.newVocabulary.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/60 flex items-start justify-between gap-2"
                      >
                        <div className="pr-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                              {item.german}
                            </span>
                            {item.plural && (
                              <span className="text-xs text-stone-500 dark:text-stone-400">
                                ({item.plural})
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">
                            = {item.english}
                          </span>
                          {item.contextSentence && (
                            <span className="text-[11px] text-stone-500 italic block leading-relaxed">
                              "{item.contextSentence}"
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handlePlayAudio(item.german)}
                          disabled={playingWord === item.german}
                          className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-all flex items-center justify-center shrink-0 active:scale-95"
                          title="Listen to German word"
                          aria-label="Listen to German word"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 2. Useful Phrases */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  2. Useful Conversational Phrases
                </h4>
                <div className="space-y-2">
                  {summary.usefulPhrases.map((phrase, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/60 flex items-start justify-between gap-3"
                    >
                      <div className="pr-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                            "{phrase.german}"
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            — {phrase.english}
                          </span>
                        </div>
                        <span className="text-xs text-amber-800 dark:text-amber-300/90 block mt-1 leading-relaxed">
                          💡 {phrase.usageNote}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePlayAudio(phrase.german)}
                        disabled={playingWord === phrase.german}
                        className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-all flex items-center justify-center shrink-0 active:scale-95"
                        title="Listen to phrase"
                        aria-label="Listen to phrase"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. Important Corrections */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  3. Important Corrections &amp; Grammar
                </h4>
                {summary.importantCorrections.length === 0 ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                    Großartig! No major structural errors during this practice session.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {summary.importantCorrections.map((corr, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/60 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-rose-600 dark:text-rose-400 line-through">
                            "{corr.original}"
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            "{corr.corrected}"
                          </span>
                        </div>
                        <p className="text-stone-600 dark:text-stone-300 leading-relaxed pl-2 border-l-2 border-amber-400 dark:border-amber-600">
                          {corr.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 4. Recurring Mistakes */}
              {summary.recurringMistakes.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                    4. Patterns to Watch Out For
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200/70 dark:border-stone-700/60 leading-relaxed">
                    {summary.recurringMistakes.map((mistake, idx) => (
                      <li key={idx}>{mistake}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 5. Practice Next */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-600" />
                  5. Actionable Next Steps
                </h4>
                <div className="space-y-2">
                  {summary.practiceNext.map((goal, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs font-medium text-amber-950 dark:text-amber-200 flex items-start gap-2 leading-relaxed"
                    >
                      <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{goal}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-4 sm:px-6 py-3.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 shrink-0 pb-safe">
          <button
            id="recap-restart-session-btn"
            onClick={() => {
              onRestartSession();
              onClose();
            }}
            className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start New Session</span>
          </button>

          <button
            id="recap-resume-speaking-btn"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-xl bg-amber-700 text-white hover:bg-amber-800 transition-colors shadow-xs active:scale-95 text-center"
          >
            Resume Speaking
          </button>
        </div>
      </div>
    </div>
  );
};

function formatSummaryAsMarkdown(summary: SessionSummaryData): string {
  let md = `# German Speaking Session Review\n\n`;
  md += `**Level Reached:** ${summary.levelReached} | **Total Turns:** ${summary.totalTurns} | **Duration:** ${summary.sessionDurationEstimate}\n\n`;

  md += `## 1. New Vocabulary\n`;
  summary.newVocabulary.forEach((v) => {
    md += `- **${v.german}** ${v.plural ? `(${v.plural})` : ''} — ${v.english}\n  *Example:* "${v.contextSentence}"\n`;
  });
  md += `\n`;

  md += `## 2. Useful Phrases\n`;
  summary.usefulPhrases.forEach((p) => {
    md += `- **"${p.german}"** — ${p.english} (*${p.usageNote}*)\n`;
  });
  md += `\n`;

  md += `## 3. Important Corrections\n`;
  summary.importantCorrections.forEach((c) => {
    md += `- ❌ ~${c.original}~\n  ✅ **${c.corrected}**\n  *Why:* ${c.explanation}\n\n`;
  });

  if (summary.recurringMistakes.length > 0) {
    md += `## 4. Recurring Mistakes\n`;
    summary.recurringMistakes.forEach((m) => {
      md += `- ${m}\n`;
    });
    md += `\n`;
  }

  md += `## 5. What to Practice Next\n`;
  summary.practiceNext.forEach((n, idx) => {
    md += `${idx + 1}. ${n}\n`;
  });

  return md;
}
