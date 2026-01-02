import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Zap, Target, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  wpm: number;
  accuracy: number;
  duration_seconds: number;
  text_length: string;
  text_topic: string;
  completed_at: string;
  display_name?: string | null;
}

type FilterPeriod = 'all' | 'today' | 'week' | 'month';
type FilterTopic = 'all' | 'nature' | 'technology' | 'motivation' | 'daily life' | 'quotes' | 'code';

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [filterTopic, setFilterTopic] = useState<FilterTopic>('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [filterPeriod, filterTopic]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    
    let query = supabase
      .from('typing_sessions')
      .select(`
        id,
        user_id,
        wpm,
        accuracy,
        duration_seconds,
        text_length,
        text_topic,
        completed_at
      `)
      .order('wpm', { ascending: false })
      .limit(50);

    // Apply time filter
    if (filterPeriod !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filterPeriod) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }
      
      query = query.gte('completed_at', startDate.toISOString());
    }

    // Apply topic filter
    if (filterTopic !== 'all') {
      query = query.eq('text_topic', filterTopic);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leaderboard:', error);
    } else {
      setEntries(data || []);
    }
    
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };

  const getTopicEmoji = (topic: string) => {
    const emojis: Record<string, string> = {
      nature: '🌿',
      technology: '💻',
      motivation: '⭐',
      'daily life': '🏠',
      quotes: '💬',
      code: '👨‍💻',
      custom: '✏️'
    };
    return emojis[topic] || '📝';
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Typists
          </CardTitle>
          
          <div className="flex flex-wrap gap-2">
            <Select value={filterPeriod} onValueChange={(v: FilterPeriod) => setFilterPeriod(v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTopic} onValueChange={(v: FilterTopic) => setFilterTopic(v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                <SelectItem value="nature">🌿 Nature</SelectItem>
                <SelectItem value="technology">💻 Technology</SelectItem>
                <SelectItem value="motivation">⭐ Motivation</SelectItem>
                <SelectItem value="daily life">🏠 Daily Life</SelectItem>
                <SelectItem value="quotes">💬 Quotes</SelectItem>
                <SelectItem value="code">👨‍💻 Code</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No entries yet. Be the first to set a record!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const isCurrentUser = user?.id === entry.user_id;
              const displayName = `Typist #${index + 1}`;
              
              
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isCurrentUser 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {displayName}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getTopicEmoji(entry.text_topic)} {entry.text_topic}</span>
                      <span>•</span>
                      <span>{entry.text_length}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1" title="Words Per Minute">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-bold">{entry.wpm}</span>
                      <span className="text-muted-foreground text-xs">WPM</span>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-1" title="Accuracy">
                      <Target className="h-4 w-4 text-success" />
                      <span className="font-medium">{Number(entry.accuracy).toFixed(0)}%</span>
                    </div>

                    <div className="hidden md:flex items-center gap-1" title="Duration">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDuration(entry.duration_seconds)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
