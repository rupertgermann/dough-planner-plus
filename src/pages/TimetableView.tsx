import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
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

    // Work backward from ready time
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-5">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{recipe.name}</h1>
            <p className="text-sm text-muted-foreground">Baking Timetable</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {/* Time Picker */}
        <Card className="mb-8">
          <CardContent className="flex flex-wrap items-end gap-4 p-4">
            <div>
              <Label className="text-xs text-muted-foreground">Bread ready date</Label>
              <Input
                type="date"
                value={readyDate}
                onChange={(e) => setReadyDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bread ready time</Label>
              <Input
                type="time"
                value={readyTime}
                onChange={(e) => setReadyTime(e.target.value)}
                className="w-32"
              />
            </div>
            {timeline.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Start at{" "}
                <span className="font-semibold text-foreground">
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
            <Button asChild variant="link" className="mt-2">
              <Link to={`/recipe/${recipe.id}`}>Add baking steps →</Link>
            </Button>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[39px] top-4 bottom-4 w-0.5 bg-border" />

            {timeline.map(({ step, startTime, endTime }, i) => (
              <div key={step.id} className="relative flex gap-4 pb-6">
                {/* Time column */}
                <div className="w-[80px] shrink-0 pt-3 text-right">
                  <span className="text-sm font-semibold text-foreground">
                    {formatTime(startTime)}
                  </span>
                </div>

                {/* Dot */}
                <div className="relative z-10 mt-3.5 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-card" />

                {/* Card */}
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{step.name}</h3>
                        {step.instructions && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {step.instructions}
                          </p>
                        )}
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
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
                <span className="text-sm font-semibold text-primary">
                  {readyTime}
                </span>
              </div>
              <div className="relative z-10 mt-3.5 h-3 w-3 shrink-0 rounded-full bg-primary" />
              <div className="pt-2.5">
                <span className="font-semibold text-primary">🍞 Bread ready!</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TimetableView;
