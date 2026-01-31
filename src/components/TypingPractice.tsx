import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Play, LogOut, User, Trophy, Clock, Target, Volume2, VolumeX, BarChart3, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Celebration } from "./Celebration";
import Leaderboard from "./Leaderboard";
import StatsDashboard from "./StatsDashboard";
import { DifficultySelector, DifficultyLevel, difficultyConfigs, difficultyTexts, getTextForDifficulty } from "./DifficultySelector";

// Extended typing texts database
const typingTexts = {
  short: {
    nature: "The sun is bright. Birds sing in trees. Flowers bloom in spring. Rain helps plants grow.",
    technology: "Apps help us learn. Code makes websites work. Robots can help people. Games are fun to play.",
    motivation: "Try your best. Practice makes perfect. You can do it. Keep going forward.",
    "daily life": "I wake up early. I brush my teeth. I eat breakfast. School starts at eight.",
    quotes: "The only way to do great work is to love what you do. Stay hungry, stay foolish.",
    code: "const hello = 'world'; function add(a, b) { return a + b; } console.log(add(1, 2));"
  },
  medium: {
    nature: "Every morning the sun rises and brings light to our world. Trees sway gently in the breeze while birds chirp happily in their branches. The grass is green and fresh after the morning dew. Nature gives us peace and beauty every single day.",
    technology: "Technology helps us connect with friends and family around the world. We use computers to learn new things and solve problems. Smart phones let us take pictures and share moments with others. The internet gives us access to knowledge and information.",
    motivation: "Success comes to those who work hard and never give up. Every small step you take brings you closer to your goals. Believe in yourself and your abilities. With practice and patience, you can achieve anything you set your mind to accomplish.",
    "daily life": "Every morning I wake up early and drink a glass of water. Then I brush my teeth and get dressed for school. I pack my backpack with books and supplies. After breakfast, I walk to school with my friends and start learning new things.",
    quotes: "In the middle of difficulty lies opportunity. The future belongs to those who believe in the beauty of their dreams. It does not matter how slowly you go as long as you do not stop. The best time to plant a tree was twenty years ago. The second best time is now.",
    code: "function fetchData(url) { return fetch(url).then(res => res.json()).catch(err => console.error(err)); } const data = await fetchData('/api/users'); data.forEach(user => console.log(user.name));"
  },
  long: {
    nature: "The natural world around us is full of wonder and beauty that never fails to amaze. From the tallest mountains to the deepest oceans, nature provides us with incredible landscapes and diverse ecosystems. Trees clean the air we breathe while flowers add color and fragrance to our environment. Animals large and small play important roles in maintaining the balance of life. Rivers flow through valleys carrying fresh water to plants and creatures. The changing seasons bring different weather patterns and transform the world around us. Spring brings new growth and blooming flowers. Summer provides warm sunshine and long days. Fall shows us beautiful colors as leaves change. Winter covers the ground with snow and gives nature time to rest.",
    technology: "Technology has transformed the way we live, work, and communicate in the modern world. Computers process information at incredible speeds and help us solve complex problems. The internet connects billions of people across the globe, allowing instant communication and access to vast amounts of knowledge. Smart phones have become powerful tools that fit in our pockets, combining communication, entertainment, and productivity features. Artificial intelligence helps us automate tasks and make better decisions. Medical technology saves lives and improves health outcomes. Transportation technology makes travel faster and safer. Educational technology makes learning more interactive and accessible to students everywhere.",
    motivation: "Success does not come overnight but is built slowly through consistent effort, patience, and belief in yourself. Each small step forward creates a strong foundation for future achievements. When you face challenges, remember that they are opportunities to grow stronger and wiser. The path to success requires dedication, hard work, and the willingness to learn from both successes and failures. Great achievers throughout history have shown us that persistence and determination can overcome any obstacle. Set clear goals for yourself and work toward them every single day. Surround yourself with positive people who support your dreams. Never let fear of failure stop you from trying new things. Every expert was once a beginner who refused to give up.",
    "daily life": "My daily routine starts early in the morning when the alarm clock rings at seven. I stretch and take a few deep breaths before getting out of bed. The first thing I do is drink a tall glass of water to help my body wake up. Then I brush my teeth carefully and wash my face with cool water. After getting dressed in clean clothes, I make my bed and organize my room. Breakfast is an important meal that gives me energy for the day ahead. I usually eat cereal with milk, toast with jam, and fresh fruit. Before leaving for school, I pack my backpack with textbooks, notebooks, pencils, and other supplies I will need. The walk to school takes about fifteen minutes and I enjoy seeing friends along the way.",
    quotes: "The greatest glory in living lies not in never falling, but in rising every time we fall. The way to get started is to quit talking and begin doing. Your time is limited, so do not waste it living someone else's life. If life were predictable it would cease to be life, and be without flavor. If you look at what you have in life, you will always have more. If you look at what you do not have in life, you will never have enough. Life is what happens when you are busy making other plans. Spread love everywhere you go. Let no one ever come to you without leaving happier.",
    code: "class UserService { constructor(apiUrl) { this.apiUrl = apiUrl; } async getUsers() { const response = await fetch(this.apiUrl); if (!response.ok) throw new Error('Failed to fetch'); return response.json(); } async createUser(userData) { const response = await fetch(this.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) }); return response.json(); } }"
  }
};

type TextTopic = 'nature' | 'technology' | 'motivation' | 'daily life' | 'quotes' | 'code';
type TimeLimit = 'unlimited' | '30' | '60' | '120';

interface TypingStats {
  wpm: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  total: number;
}

export default function TypingPractice() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playSound, playVictoryFanfare, playNewRecordFanfare } = useSoundEffects(soundEnabled);

  // Difficulty system
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [selectedTopic, setSelectedTopic] = useState<TextTopic>('nature');
  const [selectedTime, setSelectedTime] = useState<TimeLimit>('unlimited');
  const [failedAccuracy, setFailedAccuracy] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [customText, setCustomText] = useState('');
  const [useCustomText, setUseCustomText] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    correct: 0,
    incorrect: 0,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('practice');
  const [sessionSaved, setSessionSaved] = useState(false);
  
  // Personal best tracking
  const [personalBest, setPersonalBest] = useState<{ wpm: number; accuracy: number } | null>(null);
  const [celebration, setCelebration] = useState<{ type: 'complete' | 'newRecord' | 'milestone'; wpm?: number; accuracy?: number; message?: string } | null>(null);
  const [lastInputLength, setLastInputLength] = useState(0);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch personal best on mount
  useEffect(() => {
    if (user) {
      fetchPersonalBest();
    }
  }, [user]);

  const fetchPersonalBest = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('typing_sessions')
        .select('wpm, accuracy')
        .eq('user_id', user.id)
        .order('wpm', { ascending: false })
        .limit(1)
        .single();
      
      if (data && !error) {
        setPersonalBest({ wpm: data.wpm, accuracy: data.accuracy });
      }
    } catch (e) {
      // No personal best yet
    }
  };

  // Update time limit when difficulty changes
  useEffect(() => {
    const config = difficultyConfigs[difficulty];
    setSelectedTime(config.defaultTimeLimit as TimeLimit);
  }, [difficulty]);

  // Initialize text based on difficulty
  useEffect(() => {
    if (!useCustomText) {
      const text = getTextForDifficulty(difficulty, selectedTopic, typingTexts);
      setCurrentText(text);
    }
    resetPractice();
  }, [difficulty, selectedTopic, useCustomText]);

  // Timer effect
  useEffect(() => {
    if (isActive && selectedTime !== 'unlimited' && startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const limit = parseInt(selectedTime);
        const remaining = limit - elapsed;
        
        if (remaining <= 0) {
          setTimeRemaining(0);
          setIsActive(false);
          if (timerRef.current) clearInterval(timerRef.current);
          handleSessionComplete();
        } else {
          setTimeRemaining(remaining);
        }
      }, 100);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isActive, selectedTime, startTime]);

  // Calculate stats
  const calculateStats = useCallback(() => {
    if (!startTime || userInput.length === 0) return;

    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // minutes
    const wordsTyped = userInput.length / 5; // standard word length
    const wpm = Math.round(wordsTyped / timeElapsed) || 0;

    let correct = 0;
    let incorrect = 0;
    
    for (let i = 0; i < userInput.length; i++) {
      if (i < currentText.length && userInput[i] === currentText[i]) {
        correct++;
      } else {
        incorrect++;
      }
    }

    const accuracy = userInput.length > 0 ? Math.round((correct / userInput.length) * 100) : 100;

    setStats({
      wpm,
      accuracy,
      correct,
      incorrect,
      total: userInput.length
    });
  }, [userInput, currentText, startTime]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const handleSessionComplete = async () => {
    if (sessionSaved || !startTime) return;

    const duration = Math.floor((Date.now() - startTime) / 1000);
    const config = difficultyConfigs[difficulty];
    
    // Check error tolerance
    const meetsAccuracyRequirement = stats.accuracy >= config.errorTolerance;
    
    if (!meetsAccuracyRequirement && config.errorTolerance > 0) {
      setFailedAccuracy(true);
      playSound('error');
      toast({
        title: "❌ Accuracy Too Low",
        description: `${config.label} mode requires ${config.errorTolerance}%+ accuracy. You got ${stats.accuracy}%.`,
        variant: "destructive"
      });
      return;
    }

    const isNewRecord = personalBest ? stats.wpm > personalBest.wpm : stats.wpm > 0;
    
    // Trigger celebration
    if (isNewRecord && user) {
      playNewRecordFanfare();
      setCelebration({
        type: 'newRecord',
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        message: personalBest 
          ? `You beat your previous best of ${personalBest.wpm} WPM!` 
          : 'Your first recorded score!'
      });
      setPersonalBest({ wpm: stats.wpm, accuracy: stats.accuracy });
    } else {
      playVictoryFanfare();
      setCelebration({
        type: 'complete',
        wpm: stats.wpm,
        accuracy: stats.accuracy,
      });
    }

    if (!user) return;
    
    // Map difficulty to text_length for database compatibility
    const lengthMap: Record<DifficultyLevel, string> = {
      beginner: 'short',
      intermediate: 'medium',
      advanced: 'long',
      expert: 'long'
    };
    
    try {
      const { error } = await supabase.from('typing_sessions').insert({
        user_id: user.id,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        duration_seconds: duration,
        text_length: lengthMap[difficulty],
        text_topic: useCustomText ? 'custom' : selectedTopic,
        correct_chars: stats.correct,
        incorrect_chars: stats.incorrect,
        total_chars: stats.total
      });

      if (error) throw error;
      
      setSessionSaved(true);
      toast({
        title: isNewRecord ? "🏆 New Personal Best!" : "Session saved! 🎉",
        description: `WPM: ${stats.wpm} | Accuracy: ${stats.accuracy}% | ${config.label} Mode`
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const resetPractice = () => {
    setUserInput('');
    setIsActive(false);
    setStartTime(null);
    setTimeRemaining(null);
    setSessionSaved(false);
    setFailedAccuracy(false);
    setStats({
      wpm: 0,
      accuracy: 100,
      correct: 0,
      incorrect: 0,
      total: 0
    });
    if (timerRef.current) clearInterval(timerRef.current);
    inputRef.current?.focus();
  };

  const startPractice = () => {
    if (useCustomText && customText.trim()) {
      setCurrentText(customText.trim());
    }
    if (!isActive && userInput.length === 0) {
      setStartTime(Date.now());
      setIsActive(true);
      if (selectedTime !== 'unlimited') {
        setTimeRemaining(parseInt(selectedTime));
      }
    }
    inputRef.current?.focus();
  };

  const handleInputChange = (value: string) => {
    if (!isActive && value.length > 0) {
      setStartTime(Date.now());
      setIsActive(true);
      if (selectedTime !== 'unlimited') {
        setTimeRemaining(parseInt(selectedTime));
      }
    }
    
    // Play sound effects for typing
    if (value.length > lastInputLength) {
      const lastChar = value[value.length - 1];
      const expectedChar = currentText[value.length - 1];
      if (lastChar === expectedChar) {
        playSound('keypress');
      } else {
        playSound('error');
      }
    }
    setLastInputLength(value.length);
    
    // Prevent typing beyond text length
    if (value.length <= currentText.length) {
      setUserInput(value);
    }

    // Complete when finished
    if (value.length === currentText.length && !sessionSaved) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      handleSessionComplete();
    }
  };

  const getCharacterStatus = (index: number) => {
    if (index >= userInput.length) return 'pending';
    return userInput[index] === currentText[index] ? 'correct' : 'incorrect';
  };

  const progress = currentText.length > 0 ? (userInput.length / currentText.length) * 100 : 0;
  const isCompleted = progress === 100 || (timeRemaining === 0 && selectedTime !== 'unlimited');

  return (
    <>
      {/* Celebration overlay */}
      {celebration && (
        <Celebration
          type={celebration.type}
          wpm={celebration.wpm}
          accuracy={celebration.accuracy}
          message={celebration.message}
          onComplete={() => setCelebration(null)}
        />
      )}
      
      <div className="min-h-screen bg-gradient-primary p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                ⌨️ Fynzatyp
              </h1>
              <p className="text-white/90 text-sm md:text-lg">
                Improve your typing speed and accuracy!
                {personalBest && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                    <Trophy className="h-3 w-3" />
                    Best: {personalBest.wpm} WPM
                  </span>
                )}
              </p>
            </div>
          
          <div className="flex items-center gap-3">
            {/* Sound Toggle */}
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-white hover:text-white/80 transition-colors"
                aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
            
            {user ? (
              <>
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 text-white">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {user.email?.split("@")[0]}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="gap-2 bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                className="gap-2 bg-white/20 border-white/30 text-white hover:bg-white/30"
                variant="outline"
              >
                <User className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/20">
            <TabsTrigger value="practice" className="gap-2 data-[state=active]:bg-white">
              <Target className="h-4 w-4" />
              Practice
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2 data-[state=active]:bg-white">
              <BarChart3 className="h-4 w-4" />
              My Stats
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2 data-[state=active]:bg-white">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="practice" className="space-y-4 mt-4">
            {/* Difficulty Selection */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  🎮 Choose Difficulty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DifficultySelector
                  selected={difficulty}
                  onSelect={setDifficulty}
                  disabled={isActive}
                />
                
                {/* Difficulty info banner */}
                {difficulty !== 'beginner' && (
                  <div className="mt-4 p-3 rounded-lg bg-muted flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium">{difficultyConfigs[difficulty].label} Mode:</span>
                      {' '}Requires {difficultyConfigs[difficulty].errorTolerance}%+ accuracy.
                      {selectedTime !== 'unlimited' && ` Time limit: ${selectedTime}s.`}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Topic & Time Settings */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  🎯 Challenge Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic</label>
                  <Select 
                    value={selectedTopic} 
                    onValueChange={(value: TextTopic) => {
                      setSelectedTopic(value);
                      setUseCustomText(false);
                    }}
                    disabled={useCustomText || isActive}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nature">🌿 Nature</SelectItem>
                      <SelectItem value="technology">💻 Technology</SelectItem>
                      <SelectItem value="motivation">⭐ Motivation</SelectItem>
                      <SelectItem value="daily life">🏠 Daily Life</SelectItem>
                      <SelectItem value="quotes">💬 Quotes</SelectItem>
                      <SelectItem value="code">👨‍💻 Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Time Limit
                  </label>
                  <Select 
                    value={selectedTime} 
                    onValueChange={(value: TimeLimit) => setSelectedTime(value)}
                    disabled={isActive}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlimited">⏱️ Unlimited</SelectItem>
                      <SelectItem value="30">⚡ 30 sec</SelectItem>
                      <SelectItem value="60">🔥 1 min</SelectItem>
                      <SelectItem value="120">💪 2 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant={useCustomText ? "default" : "outline"}
                    onClick={() => setUseCustomText(!useCustomText)}
                    size="sm"
                    disabled={isActive}
                  >
                    ✏️ Custom Text
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Text Input */}
            {useCustomText && (
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <Textarea
                    placeholder="Paste or type your custom practice text here..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="shadow-card">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.wpm}</div>
                  <div className="text-xs text-muted-foreground">WPM</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-card">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-success">{stats.accuracy}%</div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-card">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-correct">{stats.correct}</div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-card">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-incorrect">{stats.incorrect}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </CardContent>
              </Card>

              {selectedTime !== 'unlimited' && (
                <Card className="shadow-card">
                  <CardContent className="p-3 text-center">
                    <div className={`text-2xl font-bold ${timeRemaining && timeRemaining <= 10 ? 'text-incorrect animate-pulse' : 'text-primary'}`}>
                      {timeRemaining !== null ? timeRemaining : parseInt(selectedTime)}s
                    </div>
                    <div className="text-xs text-muted-foreground">Time Left</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Progress */}
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {userInput.length} / {currentText.length}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>

            {/* Text Display */}
            <Card className="shadow-card">
              <CardContent className="p-4 md:p-6">
                <div className="mb-4 p-4 bg-muted rounded-lg font-mono text-base md:text-lg leading-relaxed min-h-[100px] select-none overflow-auto max-h-[200px]">
                  {currentText.split('').map((char, index) => {
                    const status = getCharacterStatus(index);
                    return (
                      <span
                        key={index}
                        className={`
                          ${status === 'correct' ? 'bg-correct text-white' : ''}
                          ${status === 'incorrect' ? 'bg-incorrect text-white' : ''}
                          ${status === 'pending' ? 'text-pending' : ''}
                          ${index === userInput.length ? 'bg-primary text-white animate-pulse' : ''}
                        `}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
                
                {/* Input Area */}
                <textarea
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Start typing here..."
                  className="w-full h-20 md:h-24 p-4 border rounded-lg font-mono text-base md:text-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isCompleted}
                />
                
                {/* Controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-2">
                    {!isActive && userInput.length === 0 && (
                      <Button onClick={startPractice} className="gap-2">
                        <Play className="h-4 w-4" />
                        Start
                      </Button>
                    )}
                    
                    <Button variant="outline" onClick={resetPractice} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                  
                {isCompleted && !failedAccuracy && (
                  <Badge variant="secondary" className="bg-gradient-success text-white text-sm md:text-lg px-4 py-2">
                    🎉 {timeRemaining === 0 ? "Time's Up!" : "Completed!"}
                  </Badge>
                )}
                
                {failedAccuracy && (
                  <Badge variant="destructive" className="text-sm md:text-lg px-4 py-2">
                    ❌ Below {difficultyConfigs[difficulty].errorTolerance}% Accuracy
                  </Badge>
                )}
                </div>

                {!user && isCompleted && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    <Button variant="link" onClick={() => navigate("/auth")} className="p-0 h-auto">
                      Sign in
                    </Button>
                    {" "}to save your progress and appear on the leaderboard!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <StatsDashboard />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}
