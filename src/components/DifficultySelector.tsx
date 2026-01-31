import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, User, Flame, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface DifficultyConfig {
  level: DifficultyLevel;
  label: string;
  icon: React.ReactNode;
  description: string;
  textComplexity: 'simple' | 'moderate' | 'complex' | 'challenging';
  defaultTimeLimit: 'unlimited' | '120' | '60' | '30';
  errorTolerance: number; // percentage threshold below which session fails
  wpmMultiplier: number; // for scoring/ranking purposes
  color: string;
}

export const difficultyConfigs: Record<DifficultyLevel, DifficultyConfig> = {
  beginner: {
    level: 'beginner',
    label: 'Beginner',
    icon: <Baby className="h-5 w-5" />,
    description: 'Simple words, no time pressure, forgiving errors',
    textComplexity: 'simple',
    defaultTimeLimit: 'unlimited',
    errorTolerance: 0, // No minimum accuracy required
    wpmMultiplier: 1.0,
    color: 'bg-emerald-500'
  },
  intermediate: {
    level: 'intermediate',
    label: 'Intermediate',
    icon: <User className="h-5 w-5" />,
    description: 'Mixed vocabulary, gentle time limits, moderate accuracy',
    textComplexity: 'moderate',
    defaultTimeLimit: '120',
    errorTolerance: 70, // Need 70%+ accuracy
    wpmMultiplier: 1.25,
    color: 'bg-blue-500'
  },
  advanced: {
    level: 'advanced',
    label: 'Advanced',
    icon: <Flame className="h-5 w-5" />,
    description: 'Complex sentences, time pressure, high accuracy needed',
    textComplexity: 'complex',
    defaultTimeLimit: '60',
    errorTolerance: 85, // Need 85%+ accuracy
    wpmMultiplier: 1.5,
    color: 'bg-orange-500'
  },
  expert: {
    level: 'expert',
    label: 'Expert',
    icon: <Skull className="h-5 w-5" />,
    description: 'Challenging texts, tight deadlines, near-perfect accuracy',
    textComplexity: 'challenging',
    defaultTimeLimit: '30',
    errorTolerance: 95, // Need 95%+ accuracy
    wpmMultiplier: 2.0,
    color: 'bg-red-500'
  }
};

interface DifficultySelectorProps {
  selected: DifficultyLevel;
  onSelect: (level: DifficultyLevel) => void;
  disabled?: boolean;
}

export function DifficultySelector({ selected, onSelect, disabled }: DifficultySelectorProps) {
  const levels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {levels.map((level) => {
        const config = difficultyConfigs[level];
        const isSelected = selected === level;

        return (
          <Card
            key={level}
            onClick={() => !disabled && onSelect(level)}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:scale-[1.02] border-2",
              isSelected 
                ? "border-primary ring-2 ring-primary/20 shadow-lg" 
                : "border-transparent hover:border-muted-foreground/20",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <CardContent className="p-3 text-center space-y-2">
              <div className={cn(
                "mx-auto w-10 h-10 rounded-full flex items-center justify-center text-white",
                config.color
              )}>
                {config.icon}
              </div>
              <div className="font-semibold text-sm">{config.label}</div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {config.description}
              </p>
              {isSelected && (
                <Badge variant="secondary" className="text-xs">
                  Selected
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Difficulty-adjusted text database
export const difficultyTexts = {
  beginner: {
    nature: "The sun is up. A bird sings. The sky is blue. Trees are green. I see a cat.",
    technology: "I have a phone. It can call. It can text. Apps are fun. Games are cool.",
    motivation: "I can do it. I try hard. I am good. I win. Go me!",
    "daily life": "I wake up. I eat food. I go out. I play games. I go to bed.",
    quotes: "Be kind. Work hard. Dream big. Stay true. Have fun.",
    code: "let x = 1; let y = 2; let z = x + y; console.log(z);"
  },
  intermediate: {
    nature: "Every morning the sun rises and brings warmth to our world. Birds chirp in the trees while gentle winds blow through the leaves. The grass sparkles with morning dew.",
    technology: "Computers help us work and play every day. We use the internet to learn new things and connect with friends. Smart phones make our lives easier and more fun.",
    motivation: "Success comes from hard work and never giving up on your dreams. Each small step forward brings you closer to your goals. Believe in yourself always.",
    "daily life": "I wake up early each morning and start my day with breakfast. After getting ready, I head to school or work. In the evening, I relax and spend time with family.",
    quotes: "The only way to do great work is to love what you do. In the middle of difficulty lies opportunity. The future belongs to those who believe in their dreams.",
    code: "function greet(name) { return 'Hello, ' + name + '!'; } const message = greet('World'); console.log(message);"
  },
  advanced: {
    nature: "The intricate ecosystems of our planet demonstrate remarkable adaptability and resilience. From the microscopic organisms in soil to the magnificent creatures roaming vast savannas, each species plays a crucial role in maintaining ecological balance and biodiversity.",
    technology: "Artificial intelligence and machine learning algorithms are revolutionizing industries across the globe. These sophisticated systems can analyze vast datasets, recognize patterns, and make predictions with unprecedented accuracy, fundamentally transforming how businesses operate.",
    motivation: "Excellence is not a destination but a continuous journey of self-improvement and dedication. The most successful individuals understand that failure is merely a stepping stone to greatness, providing invaluable lessons that shape future achievements.",
    "daily life": "Modern professionals navigate increasingly complex schedules, balancing demanding careers with personal responsibilities and wellness pursuits. Effective time management and prioritization have become essential skills for maintaining productivity while preventing burnout.",
    quotes: "The measure of intelligence is the ability to change. It is not the strongest of the species that survives, nor the most intelligent, but the one most responsive to change. Innovation distinguishes between a leader and a follower.",
    code: "const fetchUserData = async (userId: string): Promise<User> => { const response = await fetch(`/api/users/${userId}`); if (!response.ok) throw new Error('Failed to fetch'); return response.json(); };"
  },
  expert: {
    nature: "Anthropogenic climate change precipitates unprecedented ecological disruptions, manifesting through accelerated desertification, coral bleaching phenomena, and catastrophic biodiversity loss. Contemporary conservation strategies necessitate comprehensive interdisciplinary approaches integrating indigenous knowledge with cutting-edge environmental science methodologies.",
    technology: "Quantum computing architectures leveraging superposition and entanglement principles promise exponential computational advantages for cryptographic applications, pharmaceutical research, and complex optimization problems, though significant engineering challenges regarding qubit coherence and error correction mechanisms remain unresolved.",
    motivation: "Psychological resilience transcends mere persistence; it encompasses the sophisticated cognitive reframing of adversity as catalytic opportunity for transformative personal development. Distinguished achievers cultivate metacognitive awareness, enabling deliberate emotional regulation and strategic adaptation amidst volatility.",
    "daily life": "Contemporary urban professionals increasingly embrace asynchronous communication protocols and distributed collaboration frameworks, fundamentally reimagining traditional workplace paradigms. This zeitgeist shift necessitates cultivating digital literacy, maintaining psychological boundaries, and establishing sustainable productivity rhythms.",
    quotes: "The impediment to action advances action. What stands in the way becomes the way. We are what we repeatedly do. Excellence, then, is not an act but a habit. The unexamined life is not worth living for a human being.",
    code: "class AsyncIterableQueue<T> implements AsyncIterable<T> { private queue: T[] = []; private resolvers: ((value: IteratorResult<T>) => void)[] = []; async *[Symbol.asyncIterator](): AsyncIterator<T> { while (true) yield await this.dequeue(); } }"
  }
};

export function getTextForDifficulty(
  difficulty: DifficultyLevel, 
  topic: string, 
  fallbackTexts: Record<string, Record<string, string>>
): string {
  const texts = difficultyTexts[difficulty];
  if (texts && texts[topic as keyof typeof texts]) {
    return texts[topic as keyof typeof texts];
  }
  // Fallback to original texts with the specified length
  const lengthMap: Record<DifficultyLevel, 'short' | 'medium' | 'long'> = {
    beginner: 'short',
    intermediate: 'medium',
    advanced: 'long',
    expert: 'long'
  };
  return fallbackTexts[lengthMap[difficulty]]?.[topic] || '';
}
