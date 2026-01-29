import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { 
  TrendingUp, TrendingDown, Target, Clock, Award, Zap, 
  Calendar, BarChart3, Activity, Trophy
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface TypingSession {
  id: string;
  wpm: number;
  accuracy: number;
  duration_seconds: number;
  text_length: string;
  text_topic: string;
  correct_chars: number;
  incorrect_chars: number;
  total_chars: number;
  completed_at: string;
}

interface StatsOverview {
  totalSessions: number;
  avgWpm: number;
  bestWpm: number;
  avgAccuracy: number;
  totalTime: number;
  totalChars: number;
  improvement: number;
}

const CHART_COLORS = {
  primary: "hsl(262, 80%, 60%)",
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  accent: "hsl(200, 100%, 60%)",
};

const PIE_COLORS = ["#a855f7", "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#06b6d4"];

export default function StatsDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TypingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [stats, setStats] = useState<StatsOverview | null>(null);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, timeRange]);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);

    const daysAgo = parseInt(timeRange);
    const startDate = subDays(new Date(), daysAgo);

    try {
      const { data, error } = await supabase
        .from("typing_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("completed_at", startDate.toISOString())
        .order("completed_at", { ascending: true });

      if (error) throw error;

      setSessions(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: TypingSession[]) => {
    if (data.length === 0) {
      setStats(null);
      return;
    }

    const totalSessions = data.length;
    const avgWpm = Math.round(data.reduce((sum, s) => sum + s.wpm, 0) / totalSessions);
    const bestWpm = Math.max(...data.map(s => s.wpm));
    const avgAccuracy = Math.round(data.reduce((sum, s) => sum + Number(s.accuracy), 0) / totalSessions);
    const totalTime = data.reduce((sum, s) => sum + s.duration_seconds, 0);
    const totalChars = data.reduce((sum, s) => sum + s.total_chars, 0);

    // Calculate improvement (compare first half to second half)
    const midpoint = Math.floor(data.length / 2);
    if (data.length >= 4) {
      const firstHalfAvg = data.slice(0, midpoint).reduce((sum, s) => sum + s.wpm, 0) / midpoint;
      const secondHalfAvg = data.slice(midpoint).reduce((sum, s) => sum + s.wpm, 0) / (data.length - midpoint);
      const improvement = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
      setStats({ totalSessions, avgWpm, bestWpm, avgAccuracy, totalTime, totalChars, improvement });
    } else {
      setStats({ totalSessions, avgWpm, bestWpm, avgAccuracy, totalTime, totalChars, improvement: 0 });
    }
  };

  const getProgressChartData = () => {
    return sessions.map(s => ({
      date: format(new Date(s.completed_at), "MMM d"),
      wpm: s.wpm,
      accuracy: Number(s.accuracy),
    }));
  };

  const getDailyAverageData = () => {
    const dailyData: Record<string, { wpm: number[]; accuracy: number[] }> = {};
    
    sessions.forEach(s => {
      const day = format(new Date(s.completed_at), "MMM d");
      if (!dailyData[day]) {
        dailyData[day] = { wpm: [], accuracy: [] };
      }
      dailyData[day].wpm.push(s.wpm);
      dailyData[day].accuracy.push(Number(s.accuracy));
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      avgWpm: Math.round(data.wpm.reduce((a, b) => a + b, 0) / data.wpm.length),
      avgAccuracy: Math.round(data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length),
      sessions: data.wpm.length,
    }));
  };

  const getTopicDistribution = () => {
    const topics: Record<string, number> = {};
    sessions.forEach(s => {
      topics[s.text_topic] = (topics[s.text_topic] || 0) + 1;
    });
    return Object.entries(topics).map(([name, value]) => ({ name, value }));
  };

  const getLengthDistribution = () => {
    const lengths: Record<string, number> = {};
    sessions.forEach(s => {
      lengths[s.text_length] = (lengths[s.text_length] || 0) + 1;
    });
    return Object.entries(lengths).map(([name, value]) => ({ name, value }));
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!user) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Sign in to view your stats</h3>
          <p className="text-muted-foreground">Track your progress and see detailed analytics</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
          <p className="text-muted-foreground">Complete some typing practice to see your stats!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Your Stats
        </h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sessions</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Avg WPM</span>
              </div>
              <div className="text-2xl font-bold text-primary">{stats.avgWpm}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Best WPM</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.bestWpm}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Avg Accuracy</span>
              </div>
              <div className="text-2xl font-bold text-success">{stats.avgAccuracy}%</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Time</span>
              </div>
              <div className="text-2xl font-bold">{formatTime(stats.totalTime)}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {stats.improvement >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className="text-xs text-muted-foreground">Progress</span>
              </div>
              <div className={`text-2xl font-bold ${stats.improvement >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.improvement >= 0 ? '+' : ''}{stats.improvement}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="daily">Daily Avg</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">WPM & Accuracy Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getProgressChartData()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="wpm"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.primary, strokeWidth: 0, r: 3 }}
                      name="WPM"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="accuracy"
                      stroke={CHART_COLORS.success}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.success, strokeWidth: 0, r: 3 }}
                      name="Accuracy %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Daily Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getDailyAverageData()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Area
                      type="monotone"
                      dataKey="avgWpm"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                      name="Avg WPM"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Topics Practiced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getTopicDistribution()}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {getTopicDistribution().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Text Lengths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getLengthDistribution()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={60} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="value" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} name="Sessions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Sessions History */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {sessions.slice().reverse().slice(0, 10).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(session.completed_at), "MMM d, h:mm a")}
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {session.text_topic}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {session.text_length}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-primary">{session.wpm} WPM</div>
                    <div className="text-xs text-muted-foreground">{session.accuracy}% accuracy</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
