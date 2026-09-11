import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Sparkles,
  ArrowRight,
  Volume2,
  Loader2,
} from 'lucide-react';
import { speechService } from '../services/speechService.ts';

interface StuckHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhrase: (phrase: string) => void;
  currentScenarioContext?: string;
}

interface PhraseResult {
  germanPhrase: string;
  phoneticGuide: string;
  usageTip: string;
  exampleSentence: string;
}

export const StuckHelperModal: React.FC<StuckHelperModalProps> = ({
  isOpen,
  onClose,
  onSelectPhrase,
  currentScenarioContext,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PhraseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isOpen) return null;

  const quickIdeas = [
    'How about we grab a coffee?',
    'Could you please repeat that?',
    'What do you recommend here?',
    'I would like to pay, please.',
    'Could you speak a little slower?',
    'Where is the nearest subway station?',
  ];

  const handleSearch = async (textToSearch: string) => {
    if (!textToSearch.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/help-phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          englishQuery: textToSearch,
          context: currentScenarioContext,
        }),
      });

      if (!res.ok) {
        throw new Error('Could not fetch phrase assistance');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Sorry, could not find translation right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = (germanText: string) => {
    setIsPlaying(true);
    speechService.speak(germanText, {
      rate: 0.85,
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  return (
    <div
      id="stuck-helper-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="stuck-helper-card"
        className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                Wie sagt man...? (Helper)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Ask in English — get the natural German phrase
              </p>
            </div>
          </div>
          <button
            id="stuck-helper-close-btn"
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1">
          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="flex gap-2"
          >
            <input
              id="stuck-helper-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'How about we grab a coffee?'"
              className="flex-1 px-3.5 py-2.5 sm:py-2 min-h-[44px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            <button
              id="stuck-helper-submit-btn"
              type="submit"
              disabled={loading || !query.trim()}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold text-sm hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>Ask</span>
            </button>
          </form>

          {/* Quick presets */}
          <div>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-semibold block mb-2">
              Common ideas learners ask for:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickIdeas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => {
                    setQuery(idea);
                    handleSearch(idea);
                  }}
                  className="min-h-[34px] px-2.5 py-1 text-xs rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors active:scale-95 text-left"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          {/* Result card */}
          {result && (
            <div
              id="stuck-helper-result"
              className="mt-3 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="pr-1">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                    You can say:
                  </span>
                  <p className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
                    "{result.germanPhrase}"
                  </p>
                  <p className="text-xs font-mono text-stone-500 dark:text-stone-400 mt-1">
                    Pronounce: {result.phoneticGuide}
                  </p>
                </div>
                <button
                  id="stuck-helper-listen-btn"
                  onClick={() => handlePlayAudio(result.germanPhrase)}
                  disabled={isPlaying}
                  className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-all flex items-center justify-center shrink-0 shadow-xs active:scale-95"
                  title="Listen to pronunciation"
                  aria-label="Listen to pronunciation"
                >
                  <Volume2
                    className={`w-5 h-5 ${isPlaying ? 'text-emerald-700 animate-pulse' : ''}`}
                  />
                </button>
              </div>

              {result.usageTip && (
                <div className="text-xs text-stone-600 dark:text-stone-300 bg-white/80 dark:bg-stone-900/60 p-3 rounded-xl flex items-start gap-2 border border-stone-200/50 dark:border-stone-700/40 leading-relaxed">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{result.usageTip}</span>
                </div>
              )}

              {result.exampleSentence && (
                <div className="text-xs text-stone-700 dark:text-stone-300">
                  <span className="font-semibold block mb-0.5">Complete German sentence:</span>
                  <span className="italic">"{result.exampleSentence}"</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pb-safe">
                <button
                  id="stuck-helper-use-phrase-btn"
                  onClick={() => {
                    onSelectPhrase(result.exampleSentence || result.germanPhrase);
                    onClose();
                  }}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-xs font-semibold rounded-xl bg-amber-700 text-white hover:bg-amber-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                >
                  <span>Use in Conversation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
