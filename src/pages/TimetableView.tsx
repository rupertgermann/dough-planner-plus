import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { getRecipe } from "@/lib/storage";
import { Recipe } from "@/types/recipe";

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

  useEffect(() => {
    if (id) {
      const r = getRecipe(id);
      if (r) setRecipe(r);
      else navigate("/");
    }
  }, [id, navigate]);

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
      {/* Decorative gears */}
      <div className="fixed top-[-50px] right-[-50px] opacity-[0.03] pointer-events-none">
        <Cog className="h-40 w-40 text-brass gear-slow" />
      </div>

      <header className="relative border-b border-brass/20 bg-card/60 backdrop-blur-xl">
        <div className="absolute inset-x-0 bottom-0 divider-glow" />
        <div className="container mx-auto flex items-center gap-4 px-4 py-6">
          <Button asChild variant="ghost" size="icon" className="hover:bg-brass/10">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gradient-brass">{recipe.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 tracking-widest uppercase">
              <Cog className="h-3 w-3 text-neon gear-slow" /> Baking Timetable
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 relative z-10">
        {/* Time Picker */}
        <Card className="mb-8 card-glow border-brass/15 bg-card/50 backdrop-blur-md">
          <CardContent className="flex flex-wrap items-end gap-4 p-5">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Ready date</Label>
              <Input
                type="date"
                value={readyDate}
                onChange={(e) => setReadyDate(e.target.value)}
                className="w-40 border-brass/20 bg-background/50 focus-visible:ring-neon/40"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Ready time</Label>
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
            {/* Vertical glowing line */}
            <div className="absolute left-[39px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-brass/40 via-neon/30 to-brass/40" />

            {timeline.map(({ step, startTime, endTime }, i) => (
              <div key={step.id} className="relative flex gap-4 pb-6 group">
                {/* Time column */}
                <div className="w-[80px] shrink-0 pt-3 text-right">
                  <span className="text-sm font-semibold font-mono text-foreground">
                    {formatTime(startTime)}
                  </span>
                </div>

                {/* Dot with pulse */}
                <div className="relative z-10 mt-3.5 shrink-0">
                  <div className="h-3 w-3 rounded-full border-2 border-neon bg-card shadow-[0_0_8px_hsl(157_100%_49%/0.5)]" />
                  <div className="absolute inset-0 h-3 w-3 rounded-full bg-neon/30 blur-sm group-hover:bg-neon/50 transition-all duration-300" />
                </div>

                {/* Card */}
                <Card className="flex-1 card-glow card-hover border-brass/10 bg-card/50 backdrop-blur-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{step.name}</h3>
                        {step.instructions && (
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {step.instructions}
                          </p>
                        )}
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-neon/10 border border-neon/20 px-2.5 py-1 text-xs font-medium text-neon neon-border">
                        <Clock className="h-3 w-3" />
                        {formatDuration(step.durationMinutes)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Ready marker */}
            <div className="relative flex gap-4">
              <div className="w-[80px] shrink-0 pt-3 text-right">
                <span className="text-sm font-bold font-mono text-neon neon-glow">
                  {readyTime}
                </span>
              </div>
              <div className="relative z-10 mt-3.5 shrink-0">
                <div className="h-3 w-3 rounded-full bg-neon shadow-[0_0_12px_hsl(157_100%_49%/0.6)]" />
                <div className="absolute inset-[-4px] rounded-full bg-neon/20 blur-md animate-pulse" />
              </div>
              <div className="pt-2.5">
                <span className="text-lg font-bold text-gradient-neon">🍞 Bread ready!</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TimetableView;
