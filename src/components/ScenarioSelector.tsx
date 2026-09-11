import React from 'react';
import { Coffee, MessageCircle, Compass, Briefcase, Stethoscope, Home } from 'lucide-react';
import { Scenario } from '../types.ts';

export const SCENARIOS: Scenario[] = [
  {
    id: 'casual',
    title: 'Casual Chat',
    germanTitle: 'Alltagsgespräch',
    description: 'Talk about your day, weekend plans, hobbies, and life in natural German.',
    initialPrompt:
      'Hallo! Schön, dass wir heute wieder Deutsch sprechen. Wie geht es dir heute und was hast du schönes gemacht?',
    starterUserPhrases: [
      'Hallo! Mir geht es gut, danke. Und dir?',
      'Heute hatte ich viel zu tun, aber es war ganz gut.',
      'Am Wochenende möchte ich Freunde treffen.',
    ],
    iconName: 'MessageCircle',
  },
  {
    id: 'cafe',
    title: 'At the Café',
    germanTitle: 'Im Café / Restaurant',
    description: 'Practice ordering drinks, pastries, asking recommendations, and paying.',
    initialPrompt:
      'Guten Tag! Willkommen im Café Sonnenschein. Möchten Sie drinnen oder draußen auf der Terrasse sitzen? Was darf ich Ihnen bringen?',
    starterUserPhrases: [
      'Ich hätte gerne einen Cappuccino und ein Stück Apfelkuchen.',
      'Was können Sie mir heute empfehlen?',
      'Könnten wir bitte zahlen? Zusammen oder getrennt?',
    ],
    iconName: 'Coffee',
  },
  {
    id: 'directions',
    title: 'Asking Directions',
    germanTitle: 'Nach dem Weg fragen',
    description: 'Navigating German cities, using public transport, and asking locals.',
    initialPrompt:
      'Entschuldigung, kann ich Ihnen helfen? Sie sehen aus, als ob Sie etwas suchen.',
    starterUserPhrases: [
      'Entschuldigung, wie komme ich zum Hauptbahnhof?',
      'Fährt diese U-Bahn direkt zum Alexanderplatz?',
      'Ist das Museum zu Fuß erreichbar?',
    ],
    iconName: 'Compass',
  },
  {
    id: 'interview',
    title: 'Job Interview',
    germanTitle: 'Vorstellungsgespräch',
    description: 'Introduce yourself, describe your background, strengths, and questions.',
    initialPrompt:
      'Guten Tag! Freut mich sehr, dass Sie da sind. Nehmen Sie gerne Platz. Können Sie sich kurz auf Deutsch vorstellen?',
    starterUserPhrases: [
      'Guten Tag, vielen Dank für die Einladung.',
      'Ich arbeite seit drei Jahren als Softwareentwickler.',
      'Ich möchte mein Deutsch im Beruf aktiv anwenden.',
    ],
    iconName: 'Briefcase',
  },
  {
    id: 'doctor',
    title: "Doctor's Visit",
    germanTitle: 'Beim Arzt / Apotheke',
    description: 'Describe symptoms, pain, asking about medicines and dosage.',
    initialPrompt:
      'Guten Tag! Nehmen Sie bitte Platz. Was führt Sie heute zu mir? Wo tut es Ihnen weh?',
    starterUserPhrases: [
      'Guten Tag, Herr Doktor. Ich habe seit gestern starke Kopfschmerzen.',
      'Muss ich dieses Medikament vor oder nach dem Essen einnehmen?',
      'Haben Sie etwas gegen Halsschmerzen?',
    ],
    iconName: 'Stethoscope',
  },
  {
    id: 'apartment',
    title: 'Apartment Search',
    germanTitle: 'Wohnungssuche & WG',
    description: 'Inquire about flat viewings, rent, Kaution, and roommate living.',
    initialPrompt:
      'Hallo! Sie interessieren sich für die 2-Zimmer-Wohnung in der Stadtmitte? Haben Sie ein paar Fragen dazu?',
    starterUserPhrases: [
      'Ist die Wohnung noch frei und ab wann?',
      'Sind die Nebenkosten in der Warmmiete enthalten?',
      'Gibt es eine Einbauküche in der Wohnung?',
    ],
    iconName: 'Home',
  },
];

interface ScenarioSelectorProps {
  currentScenario: Scenario;
  onSelectScenario: (scenario: Scenario) => void;
  disabled?: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  currentScenario,
  onSelectScenario,
  disabled,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Coffee':
        return <Coffee className="w-3.5 h-3.5" />;
      case 'Compass':
        return <Compass className="w-3.5 h-3.5" />;
      case 'Briefcase':
        return <Briefcase className="w-3.5 h-3.5" />;
      case 'Stethoscope':
        return <Stethoscope className="w-3.5 h-3.5" />;
      case 'Home':
        return <Home className="w-3.5 h-3.5" />;
      default:
        return <MessageCircle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      id="scenario-selector"
      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x py-0.5 scroll-smooth overscroll-contain"
    >
      {SCENARIOS.map((sc) => {
        const isSelected = sc.id === currentScenario.id;
        return (
          <button
            key={sc.id}
            id={`scenario-tab-${sc.id}`}
            disabled={disabled}
            onClick={() => onSelectScenario(sc)}
            title={sc.description}
            className={`min-h-[36px] sm:min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 active:scale-95 ${
              isSelected
                ? 'bg-amber-100/95 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold shadow-2xs ring-1 ring-amber-400/50'
                : 'bg-white dark:bg-stone-800 border-stone-200/80 dark:border-stone-700/60 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/50'
            }`}
          >
            {getIcon(sc.iconName)}
            <span>{sc.germanTitle}</span>
          </button>
        );
      })}
    </div>
  );
};
