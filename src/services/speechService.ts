/**
 * Speech Recognition and Synthesis Service for German Conversation Tutor
 */

// Define SpeechRecognition interface for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class SpeechService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  public isSupported: boolean = false;
  public isSpeechRecognitionSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindow;
      const SpeechRecognitionConstructor =
        win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        this.isSpeechRecognitionSupported = true;
        try {
          this.recognition = new SpeechRecognitionConstructor();
          this.recognition.continuous = false;
          this.recognition.interimResults = true;
          this.recognition.lang = 'de-DE';
        } catch (e) {
          console.warn('SpeechRecognition initialization error:', e);
        }
      }

      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
        this.initGermanVoice();
        if (this.synthesis.onvoiceschanged !== undefined) {
          this.synthesis.onvoiceschanged = () => this.initGermanVoice();
        }
      }

      this.isSupported = this.isSpeechRecognitionSupported || !!this.synthesis;
    }
  }

  private initGermanVoice() {
    if (!this.synthesis) return;
    const voices = this.synthesis.getVoices();
    // Prioritize natural de-DE voices
    const germanVoice =
      voices.find((v) => v.lang === 'de-DE' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Anna') || v.name.includes('Markus'))) ||
      voices.find((v) => v.lang.startsWith('de')) ||
      voices.find((v) => v.lang.includes('DE'));
    
    if (germanVoice) {
      this.selectedVoice = germanVoice;
    }
  }

  public getGermanVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices().filter((v) => v.lang.startsWith('de'));
  }

  public setVoice(voice: SpeechSynthesisVoice) {
    this.selectedVoice = voice;
  }

  public startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    lang: 'de-DE' | 'en-US' = 'de-DE'
  ): boolean {
    if (!this.recognition) {
      onError('Speech recognition is not supported in your current browser.');
      return false;
    }

    try {
      this.recognition.lang = lang;
      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          onResult(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          onResult(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed') {
          onError('Microphone access was denied. Please allow microphone permission in your browser.');
        } else if (event.error === 'no-speech') {
          // Silent timeout, call onEnd
          onEnd();
        } else {
          onError(`Speech recognition error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        onEnd();
      };

      this.recognition.start();
      return true;
    } catch (e: any) {
      console.warn('Recognition start error:', e);
      onError(e.message || 'Could not start microphone');
      return false;
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
    }
  }

  public speak(
    text: string,
    options?: {
      rate?: number; // 0.8 for slow, 1.0 for normal
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    if (!this.synthesis) {
      options?.onError?.(new Error('Speech synthesis not supported'));
      return;
    }

    // Stop any ongoing speech
    this.synthesis.cancel();

    // Clean text of markdown, asterisks, brackets, and emojis for TTS
    const cleanText = text
      .replace(/[*_~`#]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/[\u{1F600}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'de-DE';
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = options?.rate ?? 0.95;
    utterance.pitch = options?.pitch ?? 1.0;

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      options?.onError?.(e);
      options?.onEnd?.();
    };

    this.synthesis.speak(utterance);
  }

  public cancelSpeech() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();
