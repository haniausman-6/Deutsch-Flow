import React, { useState } from 'react';
import { Volume2, X, Sparkles, BookOpen } from 'lucide-react';
import { speechService } from '../services/speechService.ts';

interface PronunciationSound {
  id: string;
  symbol: string;
  name: string;
  rule: string;
  englishGuide: string;
  examples: Array<{
    word: string;
    translation: string;
    phonetic: string;
  }>;
}

const PHONETIC_SOUNDS: PronunciationSound[] = [
  {
    id: 'ch',
    symbol: 'ch',
    name: 'The "ch" Sounds (ich vs. ach)',
    rule: 'After e, i, ä, ö, ü, or consonants, it is soft (ich-Laut). After a, o, u, it is throaty (ach-Laut).',
    englishGuide: 'Soft: whisper the "h" in "huge" or hiss gently like a kitten. Throaty: like clearing your throat gently (Scottish "loch").',
    examples: [
      { word: 'ich', translation: 'I', phonetic: '[eekh - soft]' },
      { word: 'Küche', translation: 'kitchen', phonetic: '[KYOO-khuh]' },
      { word: 'Mädchen', translation: 'girl', phonetic: '[MEHT-khyen]' },
      { word: 'machen', translation: 'to make', phonetic: '[MAH-khuhn - throaty]' },
      { word: 'Buch', translation: 'book', phonetic: '[BOO-kh - throaty]' },
    ],
  },
  {
    id: 'u-umlaut',
    symbol: 'ü',
    name: 'The "ü" Vowel (U-Umlaut)',
    rule: 'Shape your lips tightly for "oo" (like in "cool"), but position your tongue forward as if saying "ee" (like "see").',
    englishGuide: 'Start saying "eee" and round your lips into a tight circle without moving your tongue.',
    examples: [
      { word: 'über', translation: 'over / about', phonetic: '[OO-behr]' },
      { word: 'frühstücken', translation: 'to have breakfast', phonetic: '[FRYOO-shtyook-en]' },
      { word: 'Gemüse', translation: 'vegetables', phonetic: '[geh-MYOO-zuh]' },
      { word: 'müde', translation: 'tired', phonetic: '[MYOO-duh]' },
    ],
  },
  {
    id: 'o-umlaut',
    symbol: 'ö',
    name: 'The "ö" Vowel (O-Umlaut)',
    rule: 'Say the English "ay" or "eh" sound (as in "bed"), but round your lips into an "O" shape.',
    englishGuide: 'Similar to the vowel sound in British "bird" or French "bleu".',
    examples: [
      { word: 'schön', translation: 'beautiful / nice', phonetic: '[shurn]' },
      { word: 'hören', translation: 'to hear', phonetic: '[HUR-ren]' },
      { word: 'können', translation: 'can / to be able to', phonetic: '[KURN-nen]' },
      { word: 'Löffel', translation: 'spoon', phonetic: '[LURF-fel]' },
    ],
  },
  {
    id: 'a-umlaut',
    symbol: 'ä',
    name: 'The "ä" Vowel (A-Umlaut)',
    rule: 'Sounds like the English "e" in "bed" or "ai" in "air". Open your mouth slightly more.',
    englishGuide: 'Like the "e" in "bread" or "air".',
    examples: [
      { word: 'Käse', translation: 'cheese', phonetic: '[KEH-zuh]' },
      { word: 'spät', translation: 'late', phonetic: '[shpeht]' },
      { word: 'Äpfel', translation: 'apples', phonetic: '[EP-fuhl]' },
      { word: 'erklären', translation: 'to explain', phonetic: '[ehr-KLEH-ren]' },
    ],
  },
  {
    id: 'r-sound',
    symbol: 'r',
    name: 'The German "R"',
    rule: 'Produced at the back of the mouth near the uvula. At the end of syllables or words (-er), it vocalizes into a soft "ah".',
    englishGuide: 'Throat gargle R at the start of words (rot). At the end (Wasser), it softens into "Vah-suh".',
    examples: [
      { word: 'rot', translation: 'red', phonetic: '[roht - throaty]' },
      { word: 'sprechen', translation: 'to speak', phonetic: '[SHPREH-khyen]' },
      { word: 'Wasser', translation: 'water', phonetic: '[VAH-suh]' },
      { word: 'Brötchen', translation: 'bread roll', phonetic: '[BROHT-khyen]' },
    ],
  },
  {
    id: 'endings',
    symbol: '-en / -ig',
    name: 'Word Endings (-en, -er, -ig)',
    rule: '-en is often swallowed slightly into a quick nasal "n". In standard German, -ig is pronounced like "-ich"!',
    englishGuide: 'For "richtig", say "RIKH-tikh", not "rik-tik". For "haben", the "e" is barely pronounced.',
    examples: [
      { word: 'richtig', translation: 'correct / right', phonetic: '[RIKH-tikh]' },
      { word: 'wichtig', translation: 'important', phonetic: '[VIKH-tikh]' },
      { word: 'leben', translation: 'to live', phonetic: '[LEH-bn]' },
      { word: 'sehen', translation: 'to see', phonetic: '[ZEH-n]' },
    ],
  },
  {
    id: 'stress',
    symbol: 'Stress',
    name: 'Compound Words & Stress',
    rule: 'In German compound nouns, the primary stress is almost ALWAYS on the FIRST word!',
    englishGuide: 'HAUS-auf-ga-ben, BAHN-hof, WAS-ser-fla-sche. Emphasize the opening concept.',
    examples: [
      { word: 'Hauptbahnhof', translation: 'central station', phonetic: '[HOWPT-bahn-hohf]' },
      { word: 'Kühlschrank', translation: 'refrigerator', phonetic: '[KOOL-shrank]' },
      { word: 'Flughafen', translation: 'airport', phonetic: '[FLOOG-hah-fen]' },
      { word: 'Zahnarzt', translation: 'dentist', phonetic: '[TSAHN-ahrtst]' },
    ],
  },
];

interface PronunciationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PronunciationGuideModal: React.FC<PronunciationGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<string>(PHONETIC_SOUNDS[0].id);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSound =
    PHONETIC_SOUNDS.find((s) => s.id === activeTab) || PHONETIC_SOUNDS[0];

  const handlePlayWord = (word: string) => {
    setPlayingWord(word);
    speechService.speak(word, {
      rate: 0.85,
      onEnd: () => setPlayingWord(null),
      onError: () => setPlayingWord(null),
    });
  };

  return (
    <div
      id="pronunciation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="pronunciation-modal-card"
        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div
          id="pronunciation-modal-header"
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
              Ä
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                German Pronunciation Lab
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Master key phonemes: ch, r, ü, ö, ä &amp; stress
              </p>
            </div>
          </div>
          <button
            id="pronunciation-modal-close-btn"
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close pronunciation lab"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phoneme selector chips */}
        <div
          id="pronunciation-tabs"
          className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 border-b border-stone-100 dark:border-stone-800 overflow-x-auto no-scrollbar touch-pan-x bg-stone-50/30 dark:bg-stone-900 shrink-0"
        >
          {PHONETIC_SOUNDS.map((sound) => {
            const isActive = sound.id === activeTab;
            return (
              <button
                key={sound.id}
                id={`pronunciation-tab-${sound.id}`}
                onClick={() => setActiveTab(sound.id)}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-amber-700 text-white shadow-xs font-semibold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                <span className="font-mono font-bold text-xs">{sound.symbol}</span>
                <span>{sound.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Sound Detail Card */}
        <div
          id="pronunciation-sound-content"
          className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain flex-1"
        >
          <div>
            <h4 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              {currentSound.name}
            </h4>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {currentSound.rule}
            </p>
          </div>

          <div className="p-3 sm:p-3.5 bg-amber-50/80 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">English-Speaker Analogy:</span>
              {currentSound.englishGuide}
            </div>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Practice Words (Tap to listen)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {currentSound.examples.map((item) => (
                <div
                  key={item.word}
                  id={`practice-word-${item.word}`}
                  className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/60 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                >
                  <div className="pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        {item.word}
                      </span>
                      <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                        {item.phonetic}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 dark:text-stone-400 block mt-0.5">
                      {item.translation}
                    </span>
                  </div>
                  <button
                    onClick={() => handlePlayWord(item.word)}
                    disabled={playingWord === item.word}
                    id={`play-word-btn-${item.word}`}
                    className={`min-w-[42px] min-h-[42px] p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 active:scale-95 ${
                      playingWord === item.word
                        ? 'bg-amber-700 text-white animate-pulse'
                        : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-xs'
                    }`}
                    title={`Listen to ${item.word}`}
                    aria-label={`Listen to ${item.word}`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 shrink-0 pb-safe">
          <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
            Tutor will also highlight tricky phonemes automatically during conversations.
          </p>
          <button
            id="pronunciation-modal-done-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[42px] text-xs font-semibold rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-xs active:scale-95"
          >
            Fertig (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
