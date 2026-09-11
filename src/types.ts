export type CEFRLevel = 'A2' | 'B1';

export interface MessageCorrection {
  hasCorrection: boolean;
  userOriginal?: string;
  corrected?: string;
  explanation?: string;
  type?: 'grammar' | 'naturalness' | 'none';
}

export interface PronunciationTip {
  hasTip: boolean;
  word?: string;
  sound?: string;
  englishGuide?: string;
  practiceTip?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  spokenText?: string;
  correction?: MessageCorrection;
  pronunciationTip?: PronunciationTip;
  quickReplies?: string[];
  level?: CEFRLevel;
}

export interface Scenario {
  id: string;
  title: string;
  germanTitle: string;
  description: string;
  initialPrompt: string;
  starterUserPhrases: string[];
  iconName: string;
}

export interface VocabularyItem {
  german: string;
  plural?: string;
  english: string;
  contextSentence: string;
}

export interface UsefulPhraseItem {
  german: string;
  english: string;
  usageNote: string;
}

export interface CorrectionItem {
  original: string;
  corrected: string;
  explanation: string;
}

export interface SessionSummaryData {
  sessionDurationEstimate: string;
  totalTurns: number;
  levelReached: string;
  newVocabulary: VocabularyItem[];
  usefulPhrases: UsefulPhraseItem[];
  importantCorrections: CorrectionItem[];
  recurringMistakes: string[];
  practiceNext: string[];
}

export type SessionSummary = SessionSummaryData;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface TutorResponse {
  tutorResponseGerman: string;
  spokenText: string;
  correction: MessageCorrection;
  pronunciationTip: PronunciationTip;
  currentLevel: CEFRLevel | string;
  quickReplies: string[];
  isSessionEnded: boolean;
}
