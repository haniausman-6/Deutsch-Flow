import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Award,
  Send,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  VolumeX,
  Languages,
  Radio,
  ArrowRight,
} from 'lucide-react';
import {
  Message,
  CEFRLevel,
  Scenario,
  SessionSummaryData,
} from './types.ts';
import { speechService } from './services/speechService.ts';
import { AudioVisualizer } from './components/AudioVisualizer.tsx';
import { PronunciationGuideModal } from './components/PronunciationGuideModal.tsx';
import { StuckHelperModal } from './components/StuckHelperModal.tsx';
import { SessionRecapModal } from './components/SessionRecapModal.tsx';
import { SCENARIOS, ScenarioSelector } from './components/ScenarioSelector.tsx';

export default function App() {
  // Scenario & Level states
  const [currentScenario, setCurrentScenario] = useState<Scenario>(SCENARIOS[0]);
  const [levelPreference, setLevelPreference] = useState<'A2' | 'B1' | 'adaptive'>('adaptive');
  const [currentAssessedLevel, setCurrentAssessedLevel] = useState<CEFRLevel>('A2');

  // Messages & Conversation state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Audio / Speech Recognition states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [speechSpeed, setSpeechSpeed] = useState<number>(0.92); // 0.8x for slow, 0.95 for normal
  const [handsFreeMode, setHandsFreeMode] = useState<boolean>(true); // Auto-mic after tutor finishes
  const [autoSpeakTutor, setAutoSpeakTutor] = useState<boolean>(true); // Speak replies out loud
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  // Modals
  const [showPronunciationModal, setShowPronunciationModal] = useState(false);
  const [showStuckModal, setShowStuckModal] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Stats
  const [sessionStartTime] = useState<Date>(new Date());
  const [totalCorrectionsCount, setTotalCorrectionsCount] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isComponentMounted = useRef(true);

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimTranscript]);

  // Initialize conversation with the chosen scenario's greeting
  useEffect(() => {
    isComponentMounted.current = true;
    startScenario(currentScenario);
    return () => {
      isComponentMounted.current = false;
      speechService.cancelSpeech();
      speechService.stopListening();
    };
  }, []);

  const startScenario = (scenario: Scenario) => {
    speechService.cancelSpeech();
    speechService.stopListening();
    setIsListening(false);
    setIsSpeaking(false);

    const initialMessage: Message = {
      id: `tutor-initial-${Date.now()}`,
      role: 'model',
      text: scenario.initialPrompt,
      spokenText: scenario.initialPrompt,
      timestamp: new Date(),
      level: 'A2',
      quickReplies: scenario.starterUserPhrases,
    };

    setMessages([initialMessage]);

    // Automatically speak the tutor greeting if enabled
    if (autoSpeakTutor) {
      playAudioForMessage(initialMessage);
    }
  };

  const handleScenarioChange = (scenario: Scenario) => {
    if (scenario.id === currentScenario.id) return;
    setCurrentScenario(scenario);
    startScenario(scenario);
  };

  // Play audio for a specific message
  const playAudioForMessage = (message: Message) => {
    const textToSpeak = message.spokenText || message.text;
    if (!textToSpeak) return;

    speechService.cancelSpeech();
    setIsSpeaking(true);
    setPlayingMessageId(message.id);

    speechService.speak(textToSpeak, {
      rate: speechSpeed,
      onEnd: () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
        // If hands-free mode is on and not currently waiting on a request, start listening!
        if (handsFreeMode && !isProcessing && isComponentMounted.current) {
          startVoiceRecognition();
        }
      },
      onError: (err) => {
        console.warn('Speech error:', err);
        setIsSpeaking(false);
        setPlayingMessageId(null);
      },
    });
  };

  // Toggle play/pause for a message
  const togglePlayMessage = (message: Message) => {
    if (playingMessageId === message.id && isSpeaking) {
      speechService.cancelSpeech();
      setIsSpeaking(false);
      setPlayingMessageId(null);
    } else {
      playAudioForMessage(message);
    }
  };

  // Start Speech Recognition
  const startVoiceRecognition = () => {
    if (isListening || isProcessing) return;
    setMicErrorMessage(null);
    speechService.cancelSpeech();
    setIsSpeaking(false);
    setPlayingMessageId(null);

    const started = speechService.startListening(
      (transcript, isFinal) => {
        setInterimTranscript(transcript);
        if (isFinal && transcript.trim()) {
          setIsListening(false);
          setInterimTranscript('');
          handleSendMessage(transcript.trim());
        }
      },
      (error) => {
        setMicErrorMessage(error);
        setIsListening(false);
        setInterimTranscript('');
      },
      () => {
        setIsListening(false);
      },
      'de-DE'
    );

    if (started) {
      setIsListening(true);
    }
  };

  const stopVoiceRecognition = () => {
    speechService.stopListening();
    setIsListening(false);
    if (interimTranscript.trim()) {
      handleSendMessage(interimTranscript.trim());
      setInterimTranscript('');
    }
  };

  const toggleVoiceRecognition = () => {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  };

  // Send message to German tutor API
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    // Check if user is saying they want to finish the session
    const lowerText = text.toLowerCase();
    const isEndingIntent =
      lowerText.includes('fertig') ||
      lowerText.includes('session beenden') ||
      lowerText.includes('tschüss') ||
      lowerText.includes('auf wiedersehen') ||
      lowerText.includes('end session') ||
      lowerText.includes('das reicht für heute');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setInterimTranscript('');
    setIsProcessing(true);
    setMicErrorMessage(null);

    try {
      // Map messages for Gemini API
      const formattedHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formattedHistory,
          userLevelPreference: levelPreference,
          scenarioContext: `${currentScenario.germanTitle}: ${currentScenario.description}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const tutorData = await res.json();

      const tutorMessage: Message = {
        id: `tutor-${Date.now()}`,
        role: 'model',
        text: tutorData.tutorResponseGerman,
        spokenText: tutorData.spokenText,
        timestamp: new Date(),
        correction: tutorData.correction,
        pronunciationTip: tutorData.pronunciationTip,
        level: tutorData.currentLevel as CEFRLevel,
        quickReplies: tutorData.quickReplies || [],
      };

      if (tutorData.correction?.hasCorrection) {
        setTotalCorrectionsCount((prev) => prev + 1);
      }

      if (tutorData.currentLevel) {
        setCurrentAssessedLevel(tutorData.currentLevel);
      }

      setMessages((prev) => [...prev, tutorMessage]);
      setIsProcessing(false);

      // Auto-speak tutor response
      if (autoSpeakTutor) {
        playAudioForMessage(tutorMessage);
      }

      // If user indicated session end or API marked session ended, trigger recap modal
      if (isEndingIntent || tutorData.isSessionEnded) {
        fetchSessionSummary([...updatedMessages, tutorMessage]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Chat error:', errorMsg);
      setIsProcessing(false);

      const fallbackMessage: Message = {
        id: `tutor-err-${Date.now()}`,
        role: 'model',
        text: 'Entschuldigung, ich habe dich kurz nicht verstanden. Könntest du das noch einmal wiederholen?',
        spokenText:
          'Entschuldigung, ich habe dich kurz nicht verstanden. Könntest du das noch einmal wiederholen?',
        timestamp: new Date(),
        quickReplies: ['Ja, gerne.', 'Können wir von vorne anfangen?'],
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    }
  };

  // Generate End of Session Summary
  const fetchSessionSummary = async (conversationMessages?: Message[]) => {
    const listToSummarize = conversationMessages || messages;
    if (listToSummarize.length <= 1) return;

    setShowRecapModal(true);
    setSummaryLoading(true);

    try {
      const formattedHistory = listToSummarize.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch('/api/session-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: formattedHistory }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate summary');
      }

      const summaryData = await res.json();
      setSessionSummary(summaryData);
    } catch (err) {
      console.error('Failed to get session recap:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleRestartSession = () => {
    setMessages([]);
    setTotalCorrectionsCount(0);
    startScenario(currentScenario);
  };

  // Determine current visualizer state
  const visualizerState: 'idle' | 'listening' | 'speaking' | 'processing' =
    isListening
      ? 'listening'
      : isSpeaking
      ? 'speaking'
      : isProcessing
      ? 'processing'
      : 'idle';

  return (
    <div
      id="german-tutor-app"
      className="flex flex-col h-[100dvh] w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans select-none overflow-hidden"
    >
      {/* Top Navigation Bar */}
      <header
        id="app-header"
        className="shrink-0 h-14 sm:h-16 border-b border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-20"
      >
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-xs shrink-0">
            DE
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                <span className="hidden xs:inline">Deutsch Sprachpartner</span>
                <span className="xs:hidden">Deutsch Partner</span>
              </h1>
              <span
                id="cefr-level-badge"
                className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-800 shrink-0"
              >
                {currentAssessedLevel}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
              Spoken German Tutor &amp; Conversation Partner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Audio speed toggle (Normal 1.0x vs Slow 0.8x) */}
          <button
            id="speech-speed-toggle-btn"
            onClick={() => setSpeechSpeed((prev) => (prev > 0.85 ? 0.8 : 0.95))}
            className={`min-h-[36px] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 shrink-0 active:scale-95 ${
              speechSpeed <= 0.85
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
            }`}
            title="Toggle tutor speech speed (0.8x for clearer pronunciation)"
            aria-label="Toggle tutor speech speed"
          >
            <span className="hidden sm:inline">
              {speechSpeed <= 0.85 ? 'Slow (0.8x)' : 'Normal (1.0x)'}
            </span>
            <span className="sm:hidden font-mono">
              {speechSpeed <= 0.85 ? '0.8x' : '1.0x'}
            </span>
          </button>

          {/* Hands-free Auto-Mic toggle (Available on all devices) */}
          <button
            id="handsfree-mode-toggle-btn"
            onClick={() => setHandsFreeMode((prev) => !prev)}
            className={`min-h-[36px] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 shrink-0 active:scale-95 ${
              handsFreeMode
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
            }`}
            title="Auto-activate microphone after tutor finishes speaking"
            aria-label="Toggle hands-free conversation"
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                handsFreeMode ? 'text-emerald-600 animate-pulse' : ''
              }`}
            />
            <span className="hidden md:inline">Hands-Free {handsFreeMode ? 'ON' : 'OFF'}</span>
            <span className="md:hidden text-[11px]">{handsFreeMode ? 'Auto' : 'Push'}</span>
          </button>

          {/* Pronunciation Lab Button */}
          <button
            id="open-pronunciation-lab-btn"
            onClick={() => setShowPronunciationModal(true)}
            className="min-h-[36px] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 transition-colors flex items-center gap-1 shrink-0 active:scale-95"
            title="Open German Pronunciation Lab (ch, r, ü, ö, ä)"
            aria-label="Open Pronunciation Lab"
          >
            <span className="font-bold text-amber-700 dark:text-amber-400">Ä/Ü</span>
            <span className="hidden sm:inline">Phonetics</span>
          </button>

          {/* End Session Review Button */}
          <button
            id="open-session-recap-btn"
            onClick={() => fetchSessionSummary()}
            className="min-h-[36px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95"
            title="End session and view written review"
            aria-label="End session and review"
          >
            <Award className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600 shrink-0" />
            <span className="hidden sm:inline">End Session &amp; Recap</span>
            <span className="sm:hidden">Recap</span>
          </button>
        </div>
      </header>

      {/* Subheader: Scenarios & Mode Bar */}
      <div
        id="scenario-bar-container"
        className="shrink-0 bg-white/80 dark:bg-stone-900/70 border-b border-stone-200/60 dark:border-stone-800/80 px-3 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
          <span className="text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider text-[10px] hidden xs:inline shrink-0">
            Situation:
          </span>
          <ScenarioSelector
            currentScenario={currentScenario}
            onSelectScenario={handleScenarioChange}
            disabled={isProcessing}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <AudioVisualizer state={visualizerState} />
        </div>
      </div>

      {/* Microphone Error Notice if permission denied */}
      {micErrorMessage && (
        <div
          id="mic-error-banner"
          className="shrink-0 mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{micErrorMessage} (You can also type your German sentences below)</span>
          </div>
          <button
            onClick={() => setMicErrorMessage(null)}
            className="text-amber-900 dark:text-amber-200 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Conversation Message Feed */}
      <main
        id="conversation-feed"
        className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 max-w-4xl w-full mx-auto overscroll-contain"
      >
        {messages.map((message) => {
          const isTutor = message.role === 'model';
          const isAudioPlaying = playingMessageId === message.id && isSpeaking;

          return (
            <div
              key={message.id}
              id={`chat-message-${message.id}`}
              className={`flex flex-col ${isTutor ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 shadow-2xs border transition-all ${
                  isTutor
                    ? 'bg-white dark:bg-stone-900 border-stone-200/90 dark:border-stone-800 text-stone-900 dark:text-stone-100'
                    : 'bg-amber-750 dark:bg-amber-800 border-amber-800 text-white'
                }`}
                style={
                  !isTutor
                    ? { backgroundColor: '#8a4b16' }
                    : undefined
                }
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span
                    className={`text-xs font-bold tracking-tight ${
                      isTutor
                        ? 'text-amber-800 dark:text-amber-400'
                        : 'text-amber-100'
                    }`}
                  >
                    {isTutor ? 'Lukas (German Partner)' : 'You (Du)'}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Timestamp */}
                    <span
                      className={`text-[10px] ${
                        isTutor
                          ? 'text-stone-400 dark:text-stone-500'
                          : 'text-amber-200/80'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Audio play/pause button for Tutor messages */}
                    {isTutor && (
                      <button
                        id={`audio-toggle-btn-${message.id}`}
                        onClick={() => togglePlayMessage(message)}
                        className={`min-w-[32px] min-h-[32px] p-1.5 rounded-lg transition-colors flex items-center justify-center active:scale-95 ${
                          isAudioPlaying
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                        title={isAudioPlaying ? 'Stop audio' : 'Listen in German'}
                        aria-label="Listen to message"
                      >
                        <Volume2
                          className={`w-3.5 h-3.5 ${
                            isAudioPlaying ? 'animate-pulse text-amber-600' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Message Content */}
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap select-text">
                  {message.text}
                </p>

                {/* Tutor's Gentle Correction Box (if any) */}
                {isTutor && message.correction?.hasCorrection && (
                  <div
                    id={`correction-box-${message.id}`}
                    className="mt-2.5 sm:mt-3 p-2.5 sm:p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs space-y-1.5"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {message.correction.userOriginal && (
                        <span className="text-rose-700 dark:text-rose-400 line-through">
                          "{message.correction.userOriginal}"
                        </span>
                      )}
                      <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="font-bold text-emerald-800 dark:text-emerald-400">
                        "{message.correction.corrected}"
                      </span>
                    </div>
                    {message.correction.explanation && (
                      <p className="text-stone-600 dark:text-stone-300 pl-2 border-l-2 border-amber-500 leading-relaxed">
                        {message.correction.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Tutor's Pronunciation Tip (if any) */}
                {isTutor && message.pronunciationTip?.hasTip && (
                  <div
                    id={`pronunciation-tip-${message.id}`}
                    className="mt-2 sm:mt-2.5 p-2.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/50 text-xs flex items-start gap-2 text-sky-950 dark:text-sky-200"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold mr-1">
                        Pronunciation ({message.pronunciationTip.word}):
                      </span>
                      <span>{message.pronunciationTip.englishGuide}</span>
                      {message.pronunciationTip.practiceTip && (
                        <span className="block text-sky-800 dark:text-sky-300 mt-0.5 italic">
                          {message.pronunciationTip.practiceTip}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Suggested Follow-up Replies */}
              {isTutor && message.quickReplies && message.quickReplies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%] sm:max-w-[85%]">
                  {message.quickReplies.map((reply, rIdx) => (
                    <button
                      key={rIdx}
                      id={`quick-reply-btn-${message.id}-${rIdx}`}
                      disabled={isProcessing}
                      onClick={() => handleSendMessage(reply)}
                      className="min-h-[36px] px-3 py-1.5 text-xs rounded-xl bg-white/90 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-900 dark:hover:text-amber-200 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700 shadow-2xs transition-all active:scale-95 text-left"
                      title="Tap to reply with this phrase"
                    >
                      💬 "{reply}"
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Interim Live Speech Transcript */}
        {interimTranscript && (
          <div
            id="live-interim-transcript-box"
            className="flex flex-col items-end"
          >
            <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl p-3 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 animate-pulse text-xs sm:text-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-800 dark:text-amber-400 mb-0.5">
                Hearing German:
              </span>
              "{interimTranscript}..."
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div id="processing-indicator" className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs pl-2 py-1">
            <div className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
            <span>Lukas is formulating a response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Bottom Voice & Text Dock */}
      <footer
        id="app-footer-dock"
        className="shrink-0 bg-white/95 dark:bg-stone-900/95 border-t border-stone-200 dark:border-stone-800 px-3 sm:px-6 py-2 sm:py-3 z-20 pb-safe"
      >
        <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3">
          {/* Main Controls Row: Mic + Stuck Helper + Input Form */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Primary Voice Microphone Button */}
            <div className="relative shrink-0">
              <button
                id="voice-mic-main-btn"
                type="button"
                onClick={toggleVoiceRecognition}
                disabled={isProcessing}
                className={`w-12 h-12 sm:w-13 sm:h-13 min-w-[48px] min-h-[48px] rounded-2xl flex items-center justify-center transition-all shadow-md focus:outline-hidden active:scale-95 ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-300 dark:ring-rose-900/60 scale-105 animate-pulse'
                    : isSpeaking
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-amber-700 hover:bg-amber-800 text-white'
                }`}
                title={
                  isListening
                    ? 'Tap to stop listening'
                    : 'Tap to speak in German'
                }
                aria-label="Voice conversation microphone"
              >
                {isListening ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>

              {/* Status pulse dot */}
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
                </span>
              )}
            </div>

            {/* "Stuck? Ask for a phrase" Button */}
            <button
              id="stuck-help-btn"
              type="button"
              onClick={() => setShowStuckModal(true)}
              className="min-h-[46px] px-2.5 sm:px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 active:scale-95"
              title="Ask how to say something in German without breaking the conversation"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Wie sagt man...?</span>
              <span className="sm:hidden text-xs">Hilfe</span>
            </button>

            {/* Text input form fallback */}
            <form
              id="message-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex-1 flex items-center gap-1.5 sm:gap-2 relative min-w-0"
            >
              <input
                id="message-input-field"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isListening
                    ? 'Speaking German...'
                    : 'Speak or type German...'
                }
                disabled={isProcessing}
                className="w-full min-h-[46px] px-3 sm:px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-base sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all min-w-0"
              />
              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="min-w-[44px] min-h-[46px] p-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-30 shrink-0 flex items-center justify-center active:scale-95"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick Helper Links / Micro-Guides */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-0.5 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {isListening ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                  ● Listening to your German speech...
                </span>
              ) : (
                <span className="truncate">
                  💡 Speak freely in German! Minor slips ignored; key grammar gently corrected.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <button
                onClick={() => setAutoSpeakTutor((prev) => !prev)}
                className="hover:underline flex items-center gap-1 text-[11px] active:scale-95"
                title="Toggle AI voice readout"
              >
                {autoSpeakTutor ? (
                  <Volume2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Voice {autoSpeakTutor ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => fetchSessionSummary()}
                className="text-amber-800 dark:text-amber-400 font-semibold hover:underline active:scale-95 text-[11px]"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PronunciationGuideModal
        isOpen={showPronunciationModal}
        onClose={() => setShowPronunciationModal(false)}
      />

      <StuckHelperModal
        isOpen={showStuckModal}
        onClose={() => setShowStuckModal(false)}
        onSelectPhrase={(phrase) => {
          setInputText(phrase);
        }}
        currentScenarioContext={currentScenario.description}
      />

      <SessionRecapModal
        isOpen={showRecapModal}
        onClose={() => setShowRecapModal(false)}
        onRestartSession={handleRestartSession}
        summary={sessionSummary}
        loading={summaryLoading}
      />
    </div>
  );
}
