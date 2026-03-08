import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Cog, Play, Pause, RotateCcw, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRecipe } from "@/lib/storage";
import { Recipe } from "@/types/recipe";
import { toast } from "sonner";

interface TimerState {
  stepId: string;
  remainingSeconds: number;
  running: boolean;
}

const TimetableView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [readyTime, setReadyTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 6);
    d.setMinutes(0);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [readyDate, setReadyDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [timers, setTimers] = useState<Map<string, TimerState>>(new Map());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (id) {
      const r = getRecipe(id);
      if (r) setRecipe(r);
      else navigate("/");
    }
  }, [id, navigate]);

  // Request notification permission
  const requestNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this browser");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      toast.success("Notifications enabled!");
    } else {
      toast.error("Notification permission denied");
    }
  }, []);

  // Timer tick
  useEffect(() => {
    const hasRunning = Array.from(timers.values()).some((t) => t.running);
    if (!hasRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setTimers((prev) => {
        const next = new Map(prev);
        let changed = false;
        next.forEach((timer, key) => {
          if (timer.running && timer.remainingSeconds > 0) {
            changed = true;
            const newRemaining = timer.remainingSeconds - 1;
            next.set(key, { ...timer, remainingSeconds: newRemaining });
            if (newRemaining === 0) {
              next.set(key, { ...timer, remainingSeconds: 0, running: false });
              // Fire notification
              const step = recipe?.steps.find((s) => s.id === key);
              if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
                new Notification("🍞 Step Complete!", {
                  body: `"${step?.name || "Step"}" is done — time for the next step!`,
                  icon: "/favicon.ico",
                });
              }
              toast.success(`"${step?.name || "Step"}" timer finished!`);
            }
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timers, recipe, notificationsEnabled]);

  const startTimer = (stepId: string, durationMinutes: number) => {
    setTimers((prev) => {
      const next = new Map(prev);
      const existing = next.get(stepId);
      if (existing && existing.remainingSeconds > 0) {
        next.set(stepId, { ...existing, running: true });
      } else {
        next.set(stepId, {
          stepId,
          remainingSeconds: durationMinutes * 60,
          running: true,
        });
      }
      return next;
    });
  };

  const pauseTimer = (stepId: string) => {
    setTimers((prev) => {
      const next = new Map(prev);
      const existing = next.get(stepId);
      if (existing) next.set(stepId, { ...existing, running: false });
      return next;
    });
  };

  const resetTimer = (stepId: string, durationMinutes: number) => {
    setTimers((prev) => {
      const next = new Map(prev);
      next.set(stepId, {
        stepId,
        remainingSeconds: durationMinutes * 60,
        running: false,
      });
      return next;
    });
  };

  const formatCountdown = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const timeline = useMemo(() => {
    if (!recipe || !recipe.steps.length) return [];
    const [hours, minutes] = readyTime.split(":").map(Number);
    const ready = new Date(readyDate);
    ready.setHours(hours, minutes, 0, 0);
    const entries: { step: typeof recipe.steps[0]; startTime: Date; endTime: Date }[] = [];
    let cursor = new Date(ready);
    for (let i = recipe.steps.length - 1; i >= 0; i--) {
      const step = recipe.steps[i];
      const endTime = new Date(cursor);
      cursor = new Date(cursor.getTime() - step.durationMinutes * 60 * 1000);
      const startTime = new Date(cursor);
      entries.unshift({ step, startTime, endTime });
    }
    return entries;
  }, [recipe, readyTime, readyDate]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (!recipe) return null;

  return (
    <div className="min-h-screen aurora-bg steampunk-bg noise-overlay mechanical-pattern relative overflow-hidden">
      <div className="fixed top-[-50px] right-[-50px] opacity-[0.03] pointer-events-none">
        <Cog className="h-40 w-40 text-brass gear-slow" />
      </div>

      <header className="relative border-b border-brass/20 glass-heavy">
        <div className="absolute inset-x-0 bottom-0 divider-glow" />
        <div className="container mx-auto flex items-center gap-3 px-4 py-4 sm:py-6 flex-wrap">
          <Button asChild variant="ghost" size="icon" className="hover:bg-brass/10">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gradient-brass truncate">{recipe.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 tracking-widest uppercase font-mono-tech">
              <Cog className="h-3 w-3 text-neon gear-slow" /> Baking Timetable
            </p>
          </div>
          {!notificationsEnabled && "Notification" in window && (
            <Button
              variant="outline"
              size="sm"
              className="border-brass/30 hover:border-brass/60 hover:bg-brass/10 transition-base"
              onClick={requestNotifications}
            >
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Enable Notifications</span>
              <span className="sm:hidden">Notify</span>
            </Button>
          )}
          {notificationsEnabled && (
            <Badge variant="outline" className="border-neon/30 text-neon font-mono-tech text-xs">
              <Bell className="mr-1 h-3 w-3" /> On
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6 sm:py-8 relative z-10">
        {/* Time Picker */}
        <Card className="mb-6 sm:mb-8 card-glow border-brass/15 glass">
          <CardContent className="flex flex-wrap items-end gap-3 sm:gap-4 p-4 sm:p-5">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-mono-tech">Ready date</Label>
              <Input
                type="date"
                value={readyDate}
                onChange={(e) => setReadyDate(e.target.value)}
                className="w-40 border-brass/20 bg-background/50 focus-visible:ring-neon/40"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-mono-tech">Ready time</Label>
              <Input
                type="time"
                value={readyTime}
                onChange={(e) => setReadyTime(e.target.value)}
                className="w-32 border-brass/20 bg-background/50 focus-visible:ring-neon/40"
              />
            </div>
            {timeline.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Start at{" "}
                <span className="font-semibold text-gradient-neon">
                  {formatTime(timeline[0].startTime)}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        {recipe.steps.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>No steps defined yet.</p>
            <Button asChild variant="link" className="mt-2 text-brass">
              <Link to={`/recipe/${recipe.id}`}>Add baking steps →</Link>
            </Button>
          </div>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute left-[23px] sm:left-[39px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-brass/40 via-neon/30 to-brass/40" />

            {timeline.map(({ step, startTime }) => {
              const timer = timers.get(step.id);
              const isRunning = timer?.running || false;
              const isFinished = timer ? timer.remainingSeconds === 0 : false;

              return (
                <div key={step.id} className="relative flex gap-2 sm:gap-4 pb-4 sm:pb-6 group">
                  <div className="w-[48px] sm:w-[80px] shrink-0 pt-3 text-right">
                    <span className="text-xs sm:text-sm font-semibold font-mono-tech text-foreground">
                      {formatTime(startTime)}
                    </span>
                  </div>

                  <div className="relative z-10 mt-3.5 shrink-0">
                    <div className={`h-3 w-3 rounded-full border-2 bg-card shadow-[0_0_8px_hsl(157_100%_49%/0.5)] ${
                      isFinished ? "border-brass bg-brass" : isRunning ? "border-neon animate-pulse" : "border-neon"
                    }`} />
                    {isRunning && (
                      <div className="absolute inset-0 h-3 w-3 rounded-full bg-neon/30 blur-sm animate-pulse" />
                    )}
                  </div>

                  <Card className={`flex-1 card-glow card-hover border-brass/10 glass min-w-0 ${
                    isRunning ? "border-neon/30 neon-border" : isFinished ? "border-brass/30 opacity-70" : ""
                  }`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-semibold text-foreground ${isFinished ? "line-through opacity-60" : ""}`}>
                            {step.name}
                          </h3>
                          {step.instructions && (
                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                              {step.instructions}
                            </p>
                          )}
                        </div>
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-neon/10 border border-neon/20 px-2 sm:px-2.5 py-1 text-xs font-medium text-neon neon-border font-mono-tech">
                          <Clock className="h-3 w-3" />
                          {formatDuration(step.durationMinutes)}
                        </span>
                      </div>

                      {/* Timer Controls */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {timer && timer.remainingSeconds > 0 && (
                          <span className={`text-lg font-bold font-mono-tech ${isRunning ? "text-neon neon-glow" : "text-foreground"}`}>
                            {formatCountdown(timer.remainingSeconds)}
                          </span>
                        )}
                        {isFinished && (
                          <Badge variant="outline" className="border-brass/40 text-brass font-mono-tech text-xs">
                            ✓ Done
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          {!isRunning && !isFinished && (
                            <Button
                              variant="ghost-neon"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => startTimer(step.id, step.durationMinutes)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {timer ? "Resume" : "Start"}
                            </Button>
                          )}
                          {isRunning && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-warning hover:bg-warning/10"
                              onClick={() => pauseTimer(step.id)}
                            >
                              <Pause className="h-3 w-3 mr-1" />
                              Pause
                            </Button>
                          )}
                          {timer && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => resetTimer(step.id, step.durationMinutes)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            {/* Ready marker */}
            <div className="relative flex gap-2 sm:gap-4">
              <div className="w-[48px] sm:w-[80px] shrink-0 pt-3 text-right">
                <span className="text-xs sm:text-sm font-bold font-mono-tech text-neon neon-glow">
                  {readyTime}
                </span>
              </div>
              <div className="relative z-10 mt-3.5 shrink-0">
                <div className="h-3 w-3 rounded-full bg-neon shadow-[0_0_12px_hsl(157_100%_49%/0.6)]" />
                <div className="absolute inset-[-4px] rounded-full bg-neon/20 blur-md animate-pulse" />
              </div>
              <div className="pt-2.5">
                <span className="text-base sm:text-lg font-bold text-gradient-neon">🍞 Bread ready!</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TimetableView;
