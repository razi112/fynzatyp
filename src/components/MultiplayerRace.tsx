import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Users, Play, Copy, Trophy, Clock, Zap, Crown, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { difficultyTexts, DifficultyLevel } from "./DifficultySelector";
import { cn } from "@/lib/utils";

type RaceStatus = 'waiting' | 'countdown' | 'in_progress' | 'completed';

interface Race {
  id: string;
  host_user_id: string;
  join_code: string;
  status: RaceStatus;
  race_text: string;
  text_topic: string;
  difficulty: string;
  max_players: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface Participant {
  id: string;
  race_id: string;
  user_id: string;
  display_name: string;
  progress: number;
  wpm: number;
  accuracy: number;
  finished_at: string | null;
  position: number | null;
  joined_at: string;
}

type View = 'menu' | 'lobby' | 'race' | 'results';

const RACE_TEXTS: Record<string, string[]> = {
  motivation: [
    "Success comes to those who work hard and never give up on their dreams. Each small step forward brings you closer to your goals.",
    "The journey of a thousand miles begins with a single step. Believe in yourself and your abilities to achieve greatness.",
    "Champions are made when no one is watching. Your daily effort compounds into extraordinary results over time."
  ],
  technology: [
    "Technology connects us across vast distances, enabling collaboration and innovation that was once impossible to imagine.",
    "The digital revolution has transformed how we work, learn, and communicate in ways previous generations never dreamed of.",
    "Artificial intelligence and machine learning are reshaping industries and creating new opportunities for those who adapt."
  ],
  nature: [
    "The natural world offers endless beauty and wonder, from mountain peaks to ocean depths, inspiring awe in all who observe.",
    "Every season brings new changes to the landscape, painting the world in different colors and textures throughout the year.",
    "Biodiversity is essential for healthy ecosystems, with each species playing a unique role in the web of life."
  ]
};

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRandomText(topic: string): string {
  const texts = RACE_TEXTS[topic] || RACE_TEXTS.motivation;
  return texts[Math.floor(Math.random() * texts.length)];
}

export default function MultiplayerRace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playSound, playVictoryFanfare } = useSoundEffects(true);
  
  const [view, setView] = useState<View>('menu');
  const [race, setRace] = useState<Race | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Typing state
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [lastInputLength, setLastInputLength] = useState(0);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user's participant data
  const myParticipant = participants.find(p => p.user_id === user?.id);
  const isHost = race?.host_user_id === user?.id;

  // Subscribe to race changes
  useEffect(() => {
    if (!race?.id) return;

    const raceChannel = supabase
      .channel(`race-${race.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_races', filter: `id=eq.${race.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedRace = payload.new as Race;
            setRace(updatedRace);
            
            if (updatedRace.status === 'countdown' && race.status !== 'countdown') {
              startCountdown();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'race_participants', filter: `race_id=eq.${race.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setParticipants(prev => [...prev, payload.new as Participant]);
          } else if (payload.eventType === 'UPDATE') {
            setParticipants(prev => 
              prev.map(p => p.id === (payload.new as Participant).id ? payload.new as Participant : p)
            );
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== (payload.old as Participant).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(raceChannel);
    };
  }, [race?.id, race?.status]);

  // Handle race status changes
  useEffect(() => {
    if (race?.status === 'in_progress' && view === 'lobby') {
      setView('race');
      inputRef.current?.focus();
    } else if (race?.status === 'completed' && view === 'race') {
      setView('results');
      if (myParticipant?.position === 1) {
        playVictoryFanfare();
      }
    }
  }, [race?.status, view, myParticipant?.position]);

  const startCountdown = () => {
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const createRace = async () => {
    if (!user) return;

    const code = generateJoinCode();
    const raceText = getRandomText('motivation');
    
    try {
      // Get display name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const displayName = profile?.display_name || user.email?.split('@')[0] || 'Player';

      const { data: raceData, error: raceError } = await supabase
        .from('typing_races')
        .insert({
          host_user_id: user.id,
          join_code: code,
          race_text: raceText,
          text_topic: 'motivation',
          difficulty: 'intermediate'
        })
        .select()
        .single();

      if (raceError) throw raceError;

      // Join as participant
      const { error: joinError } = await supabase
        .from('race_participants')
        .insert({
          race_id: raceData.id,
          user_id: user.id,
          display_name: displayName
        });

      if (joinError) throw joinError;

      setRace(raceData);
      setParticipants([{
        id: '',
        race_id: raceData.id,
        user_id: user.id,
        display_name: displayName,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished_at: null,
        position: null,
        joined_at: new Date().toISOString()
      }]);
      setView('lobby');

      toast({
        title: "Race Created! 🏁",
        description: `Share code: ${code}`
      });
    } catch (error) {
      console.error('Error creating race:', error);
      toast({
        title: "Error",
        description: "Failed to create race",
        variant: "destructive"
      });
    }
  };

  const joinRace = async () => {
    if (!user || !joinCode.trim()) return;

    try {
      // Find the race
      const { data: raceData, error: raceError } = await supabase
        .from('typing_races')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (raceError || !raceData) {
        toast({
          title: "Race not found",
          description: "Check the code or the race may have started",
          variant: "destructive"
        });
        return;
      }

      // Get display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const displayName = profile?.display_name || user.email?.split('@')[0] || 'Player';

      // Join the race
      const { error: joinError } = await supabase
        .from('race_participants')
        .insert({
          race_id: raceData.id,
          user_id: user.id,
          display_name: displayName
        });

      if (joinError) {
        if (joinError.code === '23505') {
          toast({
            title: "Already joined",
            description: "You're already in this race!",
            variant: "destructive"
          });
        }
        return;
      }

      // Fetch all participants
      const { data: allParticipants } = await supabase
        .from('race_participants')
        .select('*')
        .eq('race_id', raceData.id);

      setRace(raceData);
      setParticipants(allParticipants || []);
      setView('lobby');

      toast({
        title: "Joined Race! 🏎️",
        description: "Waiting for host to start..."
      });
    } catch (error) {
      console.error('Error joining race:', error);
    }
  };

  const startRace = async () => {
    if (!race || !isHost) return;

    try {
      // Start countdown
      await supabase
        .from('typing_races')
        .update({ status: 'countdown' as RaceStatus })
        .eq('id', race.id);

      startCountdown();

      // After countdown, start the race
      setTimeout(async () => {
        await supabase
          .from('typing_races')
          .update({ 
            status: 'in_progress' as RaceStatus, 
            started_at: new Date().toISOString() 
          })
          .eq('id', race.id);
      }, 3000);
    } catch (error) {
      console.error('Error starting race:', error);
    }
  };

  const handleInputChange = useCallback(async (value: string) => {
    if (!race || race.status !== 'in_progress') return;

    if (!isTyping && value.length > 0) {
      setStartTime(Date.now());
      setIsTyping(true);
    }

    // Play sound
    if (value.length > lastInputLength) {
      const lastChar = value[value.length - 1];
      const expectedChar = race.race_text[value.length - 1];
      playSound(lastChar === expectedChar ? 'keypress' : 'error');
    }
    setLastInputLength(value.length);

    // Prevent typing beyond text length
    if (value.length > race.race_text.length) return;
    setUserInput(value);

    // Calculate stats
    const progress = Math.round((value.length / race.race_text.length) * 100);
    let correct = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === race.race_text[i]) correct++;
    }
    const accuracy = value.length > 0 ? Math.round((correct / value.length) * 100) : 100;
    const timeElapsed = startTime ? (Date.now() - startTime) / 1000 / 60 : 0.001;
    const wpm = Math.round((value.length / 5) / timeElapsed) || 0;

    // Update progress in database
    try {
      await supabase
        .from('race_participants')
        .update({ progress, wpm, accuracy })
        .eq('race_id', race.id)
        .eq('user_id', user?.id);
    } catch (error) {
      console.error('Error updating progress:', error);
    }

    // Check if finished
    if (value.length === race.race_text.length) {
      const finishedCount = participants.filter(p => p.finished_at).length;
      const position = finishedCount + 1;
      
      await supabase
        .from('race_participants')
        .update({ 
          progress: 100,
          wpm,
          accuracy,
          finished_at: new Date().toISOString(),
          position
        })
        .eq('race_id', race.id)
        .eq('user_id', user?.id);

      // Check if all finished
      if (position === participants.length) {
        await supabase
          .from('typing_races')
          .update({ 
            status: 'completed' as RaceStatus, 
            finished_at: new Date().toISOString() 
          })
          .eq('id', race.id);
      }
    }
  }, [race, isTyping, startTime, lastInputLength, participants, user?.id, playSound]);

  const getCharacterStatus = (index: number) => {
    if (!race) return 'pending';
    if (index >= userInput.length) return 'pending';
    return userInput[index] === race.race_text[index] ? 'correct' : 'incorrect';
  };

  const copyCode = () => {
    if (race?.join_code) {
      navigator.clipboard.writeText(race.join_code);
      toast({ title: "Code copied!" });
    }
  };

  const leaveRace = () => {
    setView('menu');
    setRace(null);
    setParticipants([]);
    setUserInput('');
    setIsTyping(false);
    setStartTime(null);
    setCountdown(null);
  };

  if (!user) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Sign in to Race</h3>
          <p className="text-muted-foreground">You need to be logged in to join multiplayer races.</p>
        </CardContent>
      </Card>
    );
  }

  // Menu View
  if (view === 'menu') {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Multiplayer Race
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create Race */}
              <Card className="border-2 border-dashed hover:border-primary transition-colors cursor-pointer" onClick={createRace}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Crown className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Create Race</h3>
                  <p className="text-sm text-muted-foreground">Host a race and invite friends to compete</p>
                </CardContent>
              </Card>

              {/* Join Race */}
              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-center">Join Race</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code..."
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="text-center font-mono text-lg tracking-widest"
                    />
                    <Button onClick={joinRace} disabled={joinCode.length < 6}>
                      Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lobby View
  if (view === 'lobby' && race) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={leaveRace} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Leave Race
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Race Lobby
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-lg px-3 py-1">
                  {race.join_code}
                </Badge>
                <Button variant="outline" size="icon" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl font-bold text-primary animate-pulse">
                    {countdown}
                  </div>
                  <p className="text-xl mt-4 text-muted-foreground">Get ready...</p>
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="space-y-3">
              <h3 className="font-medium">Players ({participants.length}/{race.max_players})</h3>
              <div className="grid gap-2">
                {participants.map((p, i) => (
                  <div key={p.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold",
                      i === 0 ? "bg-primary" : "bg-secondary"
                    )}>
                      {i + 1}
                    </div>
                    <span className="font-medium flex-1">{p.display_name}</span>
                    {p.user_id === race.host_user_id && (
                      <Badge variant="outline" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Host
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Start button for host */}
            {isHost && (
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={startRace}
                disabled={participants.length < 2}
              >
                <Play className="h-5 w-5" />
                {participants.length < 2 ? "Waiting for players..." : "Start Race!"}
              </Button>
            )}

            {!isHost && (
              <div className="text-center text-muted-foreground py-4">
                <Clock className="h-6 w-6 mx-auto mb-2 animate-pulse" />
                Waiting for host to start the race...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Race View
  if (view === 'race' && race) {
    return (
      <div className="space-y-4">
        {/* Live standings */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="font-medium">Live Standings</span>
            </div>
            <div className="space-y-2">
              {[...participants]
                .sort((a, b) => b.progress - a.progress)
                .map((p, i) => (
                  <div key={p.user_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn(
                        "font-medium",
                        p.user_id === user?.id && "text-primary"
                      )}>
                        {i + 1}. {p.display_name} {p.user_id === user?.id && "(You)"}
                      </span>
                      <span className="text-muted-foreground">
                        {p.wpm} WPM · {p.progress}%
                      </span>
                    </div>
                    <Progress value={p.progress} className="h-2" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Typing area */}
        <Card className="shadow-card">
          <CardContent className="p-4 md:p-6">
            <div className="mb-4 p-4 bg-muted rounded-lg font-mono text-base md:text-lg leading-relaxed select-none">
              {race.race_text.split('').map((char, index) => {
                const status = getCharacterStatus(index);
                return (
                  <span
                    key={index}
                    className={cn(
                      status === 'correct' && 'bg-correct text-white',
                      status === 'incorrect' && 'bg-incorrect text-white',
                      status === 'pending' && 'text-pending',
                      index === userInput.length && 'bg-primary text-white animate-pulse'
                    )}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
            
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Start typing..."
              className="w-full h-20 p-4 border rounded-lg font-mono text-base resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
              disabled={myParticipant?.finished_at !== null}
            />

            {myParticipant?.finished_at && (
              <div className="mt-4 text-center">
                <Badge className="bg-gradient-success text-white text-lg px-4 py-2">
                  🎉 Finished #{myParticipant.position}!
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results View
  if (view === 'results' && race) {
    const sortedParticipants = [...participants].sort((a, b) => (a.position || 99) - (b.position || 99));
    
    return (
      <div className="space-y-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Race Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedParticipants.map((p, i) => (
              <div 
                key={p.user_id} 
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg",
                  i === 0 ? "bg-yellow-500/10 border-2 border-yellow-500" :
                  i === 1 ? "bg-gray-300/10 border border-gray-400" :
                  i === 2 ? "bg-orange-500/10 border border-orange-500" :
                  "bg-muted"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                  i === 0 ? "bg-yellow-500 text-white" :
                  i === 1 ? "bg-gray-400 text-white" :
                  i === 2 ? "bg-orange-500 text-white" :
                  "bg-muted-foreground/20"
                )}>
                  {p.position || '-'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {p.display_name}
                    {p.user_id === user?.id && <span className="text-primary ml-2">(You)</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {p.wpm} WPM · {p.accuracy}% accuracy
                  </div>
                </div>
                {i === 0 && <Crown className="h-6 w-6 text-yellow-500" />}
              </div>
            ))}

            <Button onClick={leaveRace} className="w-full mt-4">
              Back to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
