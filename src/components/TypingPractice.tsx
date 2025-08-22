import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, Play, Pause } from "lucide-react";

// Typing texts database
const typingTexts = {
  short: {
    nature: "The sun is bright. Birds sing in trees. Flowers bloom in spring. Rain helps plants grow.",
    technology: "Apps help us learn. Code makes websites work. Robots can help people. Games are fun to play.",
    motivation: "Try your best. Practice makes perfect. You can do it. Keep going forward.",
    "daily life": "I wake up early. I brush my teeth. I eat breakfast. School starts at eight."
  },
  medium: {
    nature: "Every morning the sun rises and brings light to our world. Trees sway gently in the breeze while birds chirp happily in their branches. The grass is green and fresh after the morning dew. Nature gives us peace and beauty every single day.",
    technology: "Technology helps us connect with friends and family around the world. We use computers to learn new things and solve problems. Smart phones let us take pictures and share moments with others. The internet gives us access to knowledge and information.",
    motivation: "Success comes to those who work hard and never give up. Every small step you take brings you closer to your goals. Believe in yourself and your abilities. With practice and patience, you can achieve anything you set your mind to accomplish.",
    "daily life": "Every morning I wake up early and drink a glass of water. Then I brush my teeth and get dressed for school. I pack my backpack with books and supplies. After breakfast, I walk to school with my friends and start learning new things."
  },
  long: {
    nature: "The natural world around us is full of wonder and beauty that never fails to amaze. From the tallest mountains to the deepest oceans, nature provides us with incredible landscapes and diverse ecosystems. Trees clean the air we breathe while flowers add color and fragrance to our environment. Animals large and small play important roles in maintaining the balance of life. Rivers flow through valleys carrying fresh water to plants and creatures. The changing seasons bring different weather patterns and transform the world around us. Spring brings new growth and blooming flowers. Summer provides warm sunshine and long days. Fall shows us beautiful colors as leaves change. Winter covers the ground with snow and gives nature time to rest.",
    technology: "Technology has transformed the way we live, work, and communicate in the modern world. Computers process information at incredible speeds and help us solve complex problems. The internet connects billions of people across the globe, allowing instant communication and access to vast amounts of knowledge. Smart phones have become powerful tools that fit in our pockets, combining communication, entertainment, and productivity features. Artificial intelligence helps us automate tasks and make better decisions. Medical technology saves lives and improves health outcomes. Transportation technology makes travel faster and safer. Educational technology makes learning more interactive and accessible to students everywhere.",
    motivation: "Success does not come overnight but is built slowly through consistent effort, patience, and belief in yourself. Each small step forward creates a strong foundation for future achievements. When you face challenges, remember that they are opportunities to grow stronger and wiser. The path to success requires dedication, hard work, and the willingness to learn from both successes and failures. Great achievers throughout history have shown us that persistence and determination can overcome any obstacle. Set clear goals for yourself and work toward them every single day. Surround yourself with positive people who support your dreams. Never let fear of failure stop you from trying new things. Every expert was once a beginner who refused to give up.",
    "daily life": "My daily routine starts early in the morning when the alarm clock rings at seven. I stretch and take a few deep breaths before getting out of bed. The first thing I do is drink a tall glass of water to help my body wake up. Then I brush my teeth carefully and wash my face with cool water. After getting dressed in clean clothes, I make my bed and organize my room. Breakfast is an important meal that gives me energy for the day ahead. I usually eat cereal with milk, toast with jam, and fresh fruit. Before leaving for school, I pack my backpack with textbooks, notebooks, pencils, and other supplies I will need. The walk to school takes about fifteen minutes and I enjoy seeing friends along the way."
  }
};

type TextLength = 'short' | 'medium' | 'long';
type TextTopic = 'nature' | 'technology' | 'motivation' | 'daily life';

interface TypingStats {
  wpm: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  total: number;
}

export default function TypingPractice() {
  const [selectedLength, setSelectedLength] = useState<TextLength>('short');
  const [selectedTopic, setSelectedTopic] = useState<TextTopic>('nature');
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    correct: 0,
    incorrect: 0,
    total: 0
  });
  
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize text
  useEffect(() => {
    setCurrentText(typingTexts[selectedLength][selectedTopic]);
    resetPractice();
  }, [selectedLength, selectedTopic]);

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

  const resetPractice = () => {
    setUserInput('');
    setIsActive(false);
    setStartTime(null);
    setStats({
      wpm: 0,
      accuracy: 100,
      correct: 0,
      incorrect: 0,
      total: 0
    });
    inputRef.current?.focus();
  };

  const startPractice = () => {
    if (!isActive && userInput.length === 0) {
      setStartTime(Date.now());
      setIsActive(true);
    }
    inputRef.current?.focus();
  };

  const handleInputChange = (value: string) => {
    if (!isActive && value.length > 0) {
      setStartTime(Date.now());
      setIsActive(true);
    }
    
    // Prevent typing beyond text length
    if (value.length <= currentText.length) {
      setUserInput(value);
    }

    // Complete when finished
    if (value.length === currentText.length) {
      setIsActive(false);
    }
  };

  const getCharacterStatus = (index: number) => {
    if (index >= userInput.length) return 'pending';
    return userInput[index] === currentText[index] ? 'correct' : 'incorrect';
  };

  const progress = (userInput.length / currentText.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-primary p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            ⌨️ Typing Practice
          </h1>
          <p className="text-white/90 text-lg">
            Improve your typing speed and accuracy with fun exercises!
          </p>
        </div>

        {/* Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Choose Your Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Length</label>
              <Select value={selectedLength} onValueChange={(value: TextLength) => setSelectedLength(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">📄 Short</SelectItem>
                  <SelectItem value="medium">📃 Medium</SelectItem>
                  <SelectItem value="long">📋 Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic</label>
              <Select value={selectedTopic} onValueChange={(value: TextTopic) => setSelectedTopic(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nature">🌿 Nature</SelectItem>
                  <SelectItem value="technology">💻 Technology</SelectItem>
                  <SelectItem value="motivation">⭐ Motivation</SelectItem>
                  <SelectItem value="daily life">🏠 Daily Life</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.wpm}</div>
              <div className="text-sm text-muted-foreground">WPM</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{stats.accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-correct">{stats.correct}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-incorrect">{stats.incorrect}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </CardContent>
          </Card>
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
          <CardContent className="p-6">
            <div className="mb-4 p-4 bg-muted rounded-lg font-mono text-lg leading-relaxed min-h-[120px] select-none">
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
              className="w-full h-24 p-4 border rounded-lg font-mono text-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={progress === 100}
            />
            
            {/* Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                {!isActive && userInput.length === 0 && (
                  <Button onClick={startPractice} className="gap-2">
                    <Play className="h-4 w-4" />
                    Start Typing
                  </Button>
                )}
                
                <Button variant="outline" onClick={resetPractice} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
              
              {progress === 100 && (
                <Badge variant="secondary" className="bg-gradient-success text-white text-lg px-4 py-2">
                  🎉 Completed!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}