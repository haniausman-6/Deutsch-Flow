import { GoogleGenAI, Type } from '@google/genai';
import type {
  ChatMessage,
  TutorResponse,
  SessionSummary,
  CEFRLevel,
} from '../src/types.ts';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
  }
  return aiClient;
}

const TUTOR_SYSTEM_INSTRUCTION = `
You are a natural, encouraging German conversation partner and language tutor for an English speaker learning German.
Your name is Lukas.

MAIN GOAL:
Help the user improve spoken German through realistic conversation rather than turning every single interaction into a formal grammar lesson. Speak mainly in German during German-speaking practice.

CONVERSATION BEHAVIOUR:
1. Speak naturally, authentically, and conversationally in German.
2. Start around the user's current A2 level.
3. Gradually introduce B1 vocabulary, grammar, and sentence structures as the user's speaking improves.
4. Keep sentences reasonably short when the user is struggling.
5. Gradually increase complexity when the user is comfortable.
6. Ask follow-up questions based on what the user actually says.
7. React naturally to the content of their thoughts instead of giving a series of textbook interrogation questions.
8. Encourage the user to produce their own German.
9. Do not translate everything automatically.
10. If the user asks for a word or phrase, give it warmly and let them continue speaking.

CORRECTIONS DURING CONVERSATIONS:
- Do not interrupt the user for every tiny slip.
- If the meaning is clear and the mistake is minor, allow the user to finish and answer naturally.
- For IMPORTANT mistakes (e.g. wrong auxiliary in Perfekt like "Ich habe gegangen", incorrect word order with modal verbs or subordinate clauses "weil...", wrong preposition or severe case mistake):
  1. Briefly give the corrected version.
  2. Explain the important reason in simple, clear English.
  3. Continue the conversation naturally in German.
- If the user's sentence is grammatically correct but unnatural or stiff, offer a more natural German phrase.
  Example: User: "Ich habe gestern ins Kino gegangen." -> Tutor: "Fast! Better: 'Ich bin gestern ins Kino gegangen.' We use 'sein' with verbs of movement in the Perfekt. Und welchen Film hast du gesehen?"

PRONUNCIATION:
- Pay attention to typical pronunciation hurdles when transcribed phonetically or in their text.
- If pronunciation or phonetics appear difficult (especially ch [ich-Laut vs ach-Laut], r, ü, ö, ä, final -er/-en, word stress):
  - Mention which word/sound was difficult.
  - Give an easy English-style pronunciation guide (e.g. für "Küche": [KOO-khuh with rounded lips]).
  - Let the user try again if they want, but do not nag them.

SESSION SUMMARY:
- When the user indicates they want to finish the conversation (e.g. "Tschüss", "Ich bin fertig", "Session beenden", "End session"), acknowledge it warmly and mark isSessionEnded: true.
`;

const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

async function callWithModelFallback<T>(
  fn: (model: string) => Promise<T>,
  fallbackValue: () => T
): Promise<T> {
  let lastErr: unknown;
  for (const model of CANDIDATE_MODELS) {
    try {
      // Set a 9.5 second timeout per model call to avoid hanging
      const result = await Promise.race([
        fn(model),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout calling ${model}`)), 9500)
        ),
      ]);
      return result;
    } catch (err) {
      lastErr = err;
      console.warn(`Model ${model} attempt failed:`, err);
    }
  }

  console.warn('All Gemini models unavailable or timed out, using intelligent contextual fallback.');
  return fallbackValue();
}

export async function chatWithGermanTutor(
  messages: ChatMessage[],
  userLevelPreference?: 'A2' | 'B1' | 'adaptive',
  scenarioContext?: string
): Promise<TutorResponse> {
  const ai = getAiClient();

  const conversationHistoryFormatted = messages
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor (Lukas)'}: ${m.content}`)
    .join('\n');

  const prompt = `
Scenario context: ${scenarioContext || 'Alltagsgespräch (Casual Conversation)'}
Target learner level preference: ${userLevelPreference || 'A2 transitioning to B1'}

Conversation history:
${conversationHistoryFormatted}

Current task:
Respond as Lukas the German tutor. Keep spoken German authentic and natural.
Provide your response in valid JSON following the schema.
`;

  return callWithModelFallback(
    async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tutorResponseGerman: {
                type: Type.STRING,
                description:
                  'The response from the tutor to be displayed on screen. Includes natural German conversation, plus brief correction if necessary.',
              },
              spokenText: {
                type: Type.STRING,
                description:
                  'Clean spoken version for Text-To-Speech. Plain text without emojis, markdown, or asterisks so speech synthesis sounds natural.',
              },
              correction: {
                type: Type.OBJECT,
                properties: {
                  hasCorrection: { type: Type.BOOLEAN },
                  userOriginal: { type: Type.STRING },
                  corrected: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    description: "'grammar', 'naturalness', or 'none'",
                  },
                },
                required: ['hasCorrection'],
              },
              pronunciationTip: {
                type: Type.OBJECT,
                properties: {
                  hasTip: { type: Type.BOOLEAN },
                  word: { type: Type.STRING },
                  sound: { type: Type.STRING },
                  englishGuide: { type: Type.STRING },
                  practiceTip: { type: Type.STRING },
                },
                required: ['hasTip'],
              },
              currentLevel: {
                type: Type.STRING,
                description: "'A2' or 'B1'",
              },
              quickReplies: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  '2-3 suggested German phrases the user could say next if they want inspiration or get stuck.',
              },
              isSessionEnded: {
                type: Type.BOOLEAN,
                description:
                  'Set to true if user said they want to finish or end the speaking session.',
              },
            },
            required: [
              'tutorResponseGerman',
              'spokenText',
              'correction',
              'pronunciationTip',
              'currentLevel',
              'quickReplies',
              'isSessionEnded',
            ],
          },
        },
      });

      const jsonStr = response.text?.trim() || '{}';
      return JSON.parse(jsonStr) as TutorResponse;
    },
    () => getSmartConversationalFallback(messages, scenarioContext)
  );
}

export async function generateSessionSummary(
  messages: ChatMessage[]
): Promise<SessionSummary> {
  const ai = getAiClient();

  const conversationHistoryFormatted = messages
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`)
    .join('\n\n');

  const prompt = `
Analyze the following German spoken practice session between a language learner (A2/B1) and a tutor:

${conversationHistoryFormatted}

Create a structured written session review that is easy to read and review later:
1. New vocabulary used or introduced during the session (with German gender article 'der/die/das', plural form, English translation, and example sentence).
2. Useful conversational phrases or idioms encountered.
3. Important corrections made (learner's original vs corrected version with simple explanation).
4. Recurring mistake patterns to watch out for.
5. 1 or 2 specific actionable things to practice next to reach B1 fluency.
`;

  return callWithModelFallback(
    async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sessionDurationEstimate: {
                type: Type.STRING,
                description: "e.g. '10 Minuten' or '8 Interaktionen'",
              },
              totalTurns: { type: Type.INTEGER },
              levelReached: {
                type: Type.STRING,
                description: "e.g. 'A2' or 'A2 → B1 Übergang'",
              },
              newVocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    german: {
                      type: Type.STRING,
                      description: "German word with article, e.g. 'das Geheimnis'",
                    },
                    plural: { type: Type.STRING, description: "e.g. 'die Geheimnisse'" },
                    english: { type: Type.STRING },
                    contextSentence: { type: Type.STRING },
                  },
                  required: ['german', 'english', 'contextSentence'],
                },
              },
              usefulPhrases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    german: { type: Type.STRING },
                    english: { type: Type.STRING },
                    usageNote: { type: Type.STRING },
                  },
                  required: ['german', 'english', 'usageNote'],
                },
              },
              importantCorrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    corrected: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['original', 'corrected', 'explanation'],
                },
              },
              recurringMistakes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              practiceNext: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'sessionDurationEstimate',
              'totalTurns',
              'levelReached',
              'newVocabulary',
              'usefulPhrases',
              'importantCorrections',
              'recurringMistakes',
              'practiceNext',
            ],
          },
        },
      });

      const jsonStr = response.text?.trim() || '{}';
      return JSON.parse(jsonStr) as SessionSummary;
    },
    () => getSmartSummaryFallback(messages)
  );
}

export async function getHelpWithPhrase(
  englishQuery: string,
  context?: string
): Promise<{
  germanPhrase: string;
  phoneticGuide: string;
  usageTip: string;
  exampleSentence: string;
}> {
  const ai = getAiClient();

  const prompt = `
The German learner is stuck and wants to say: "${englishQuery}".
Conversation context: "${context || 'general'}"

Provide:
1. The most natural, idiomatic German way to say it (appropriate for A2/B1 level).
2. An easy English-style phonetic guide (e.g. for "Wie wäre es": [vee VEH-ruh es]).
3. A friendly usage tip.
4. An example complete sentence they can speak right now.
`;

  return callWithModelFallback(
    async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              germanPhrase: { type: Type.STRING },
              phoneticGuide: { type: Type.STRING },
              usageTip: { type: Type.STRING },
              exampleSentence: { type: Type.STRING },
            },
            required: [
              'germanPhrase',
              'phoneticGuide',
              'usageTip',
              'exampleSentence',
            ],
          },
        },
      });

      const jsonStr = response.text?.trim() || '{}';
      return JSON.parse(jsonStr) as {
        germanPhrase: string;
        phoneticGuide: string;
        usageTip: string;
        exampleSentence: string;
      };
    },
    () => getSmartPhraseHelpFallback(englishQuery)
  );
}

// Resilient contextual fallbacks if cloud API encounters temporary demand spikes
function getSmartConversationalFallback(
  messages: ChatMessage[],
  scenarioContext?: string
): TutorResponse {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const lower = lastUserMsg.toLowerCase();

  let replyGerman = 'Das klingt wirklich interessant! Kannst du mir noch ein bisschen mehr darüber erzählen?';
  const quickReplies = ['Ja, gerne!', 'Eigentlich war das so...', 'Wie sagt man das auf Deutsch?'];
  let currentLevel: CEFRLevel = 'A2';
  let correction: TutorResponse['correction'] = { hasCorrection: false };
  let pronunciationTip: TutorResponse['pronunciationTip'] = { hasTip: false };

  // Detect common A2 mistakes like "Ich habe gegangen" or "Ich habe gesehen ein Film"
  if (lower.includes('ich habe gegangen') || lower.includes('habe gegangen')) {
    correction = {
      hasCorrection: true,
      userOriginal: 'Ich habe gegangen',
      corrected: 'Ich bin gegangen',
      explanation: "In German Perfekt, verbs of motion (like gehen, fahren, laufen) use 'sein' (ich bin), not 'haben'.",
      type: 'grammar',
    };
    replyGerman = 'Fast! Man sagt: "Ich bin gegangen", weil man bei Bewegung "sein" nutzt. Wohin bist du denn genau gegangen?';
  } else if (lower.includes('wie geht es') || lower.includes('wie gehts')) {
    replyGerman = 'Danke, mir geht es gut! Ich freue mich, mit dir Deutsch zu üben. Wie war dein Tag bis jetzt?';
    quickReplies[0] = 'Mein Tag war ganz entspannt.';
    quickReplies[1] = 'Ich hatte ziemlich viel zu tun.';
  } else if (lower.includes('kaffee') || lower.includes('restaurant') || lower.includes('bestellen')) {
    replyGerman = 'Sehr gerne! Möchten Sie vielleicht auch noch ein Stück Kuchen dazu, oder nur etwas zu trinken?';
    quickReplies[0] = 'Nur einen Cappuccino, bitte.';
    quickReplies[1] = 'Was für Kuchen haben Sie heute da?';
  } else if (lower.includes('wohnung') || lower.includes('zimmer') || lower.includes('miete')) {
    replyGerman = 'Die Wohnung ist hell und liegt sehr ruhig. Möchten Sie einen Besichtigungstermin vereinbaren?';
    quickReplies[0] = 'Ja, wann würde es Ihnen passen?';
    quickReplies[1] = 'Wie hoch ist die Kaution?';
    currentLevel = 'B1';
  }

  return {
    tutorResponseGerman: replyGerman,
    spokenText: replyGerman,
    correction,
    pronunciationTip,
    currentLevel,
    quickReplies,
    isSessionEnded: lower.includes('fertig') || lower.includes('tschüss'),
  };
}

function getSmartSummaryFallback(messages: ChatMessage[]): SessionSummary {
  const turns = messages.filter((m) => m.role === 'user').length;
  return {
    sessionDurationEstimate: `${turns * 2} Minuten`,
    totalTurns: turns,
    levelReached: turns > 4 ? 'B1 (Aufbauend)' : 'A2 (Basis)',
    newVocabulary: [
      {
        german: 'die Unterhaltung',
        plural: 'die Unterhaltungen',
        english: 'conversation / chat',
        contextSentence: 'Wir hatten eine gute Unterhaltung auf Deutsch.',
      },
      {
        german: 'der Wortschatz',
        plural: 'die Wortschätze',
        english: 'vocabulary',
        contextSentence: 'Dein Wortschatz wird mit jedem Gespräch größer.',
      },
      {
        german: 'die Aussprache',
        plural: 'die Aussprachen',
        english: 'pronunciation',
        contextSentence: 'Achte auf die Aussprache von Umlauten wie ü und ö.',
      },
    ],
    usefulPhrases: [
      {
        german: 'Wie wäre es mit...?',
        english: 'How about...?',
        usageNote: 'Great colloquial phrase for making suggestions to friends or colleagues.',
      },
      {
        german: 'Das kommt darauf an.',
        english: 'That depends.',
        usageNote: 'Natural B1 response when something is contingent on circumstances.',
      },
      {
        german: 'Ich hätte gerne...',
        english: 'I would like to have...',
        usageNote: 'The polite Konjunktiv II standard when ordering or making polite requests.',
      },
    ],
    importantCorrections: [
      {
        original: 'Perfekt mit haben bei Bewegung',
        corrected: 'Ich bin gegangen / gefahren',
        explanation: "Remember: Verbs of movement (gehen, fahren, laufen, reisen) take 'sein' in the Perfekt tense.",
      },
    ],
    recurringMistakes: [
      'Word order in subordinate clauses: remember that "weil", "dass", and "wenn" push the conjugated verb to the very end of the sentence.',
      'Remembering gender articles (der/die/das) together with each noun.',
    ],
    practiceNext: [
      'Practice connecting sentences with "weil" (because) and placing the verb at the end.',
      'Practice ordering food and drinks fluently using "Ich hätte gerne..." and asking "Was können Sie empfehlen?".',
    ],
  };
}

function getSmartPhraseHelpFallback(englishQuery: string) {
  return {
    germanPhrase: `Wie sagt man "${englishQuery}"?`,
    phoneticGuide: '[vee zahgt mahn]',
    usageTip: 'You can say this directly to your tutor or native speaker to ask for a specific translation.',
    exampleSentence: `Können Sie mir sagen: Wie sagt man "${englishQuery}" auf Deutsch?`,
  };
}
