import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Printer, Clock, Cog, Scale, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecipe, getRecipes, duplicateRecipe, deleteRecipe } from "@/lib/storage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useEffect, useState, useMemo } from "react";
import { Recipe } from "@/types/recipe";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BakeLog } from "@/components/BakeLog";
import { toast } from "sonner";

const FLOUR_KEYWORDS = ["flour", "mehl", "farine", "harina"];

const RecipeDetail = () => {
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
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (id) {
      const r = getRecipe(id);
      if (r) {
        setRecipe(r);
        document.title = r.name;
        return () => { document.title = "Bread Scheduler"; };
      } else {
        navigate("/");
      }
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

  // Baker's percentages
  const bakersPercentages = useMemo(() => {
    if (!recipe) return new Map<string, string>();
    const flourIngs = recipe.ingredients.filter((ing) =>
      FLOUR_KEYWORDS.some((kw) => ing.name.toLowerCase().includes(kw))
    );
    const totalFlour = flourIngs.reduce((sum, ing) => {
      const a = parseFloat(ing.amount);
      return sum + (isNaN(a) ? 0 : a);
    }, 0);
    if (totalFlour <= 0) return new Map<string, string>();
    const map = new Map<string, string>();
    recipe.ingredients.forEach((ing) => {
      const a = parseFloat(ing.amount);
      if (!isNaN(a) && a > 0) {
        map.set(ing.id, ((a / totalFlour) * 100).toFixed(1));
      }
    });
    return map;
  }, [recipe]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handlePrint = () => window.print();

  const handleDuplicate = () => {
    if (!recipe) return;
    const dup = duplicateRecipe(recipe.id);
    if (dup) {
      toast.success(`Duplicated as "${dup.name}"`);
      navigate(`/recipe/${dup.id}`);
    }
  };

  useKeyboardShortcuts(useMemo(() => [
    { key: "p", ctrl: true, handler: () => handlePrint() },
  ], []));

  const totalTime = recipe?.steps.reduce((sum, s) => sum + s.durationMinutes, 0) || 0;
  const hours = Math.floor(totalTime / 60);
  const mins = totalTime % 60;

  if (!recipe) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen aurora-bg steampunk-bg noise-overlay mechanical-pattern relative overflow-hidden print:!bg-[white] print:!text-[black]">
      <div className="fixed bottom-[-30px] right-[-30px] opacity-[0.03] pointer-events-none print:hidden">
        <Cog className="h-32 w-32 text-brass gear-slow" />
      </div>

      <header className="relative border-b border-brass/20 glass-heavy print:bg-[white] print:border-[#ddd]">
        <div className="absolute inset-x-0 bottom-0 divider-glow print:hidden" />
        <div className="container mx-auto flex items-center gap-3 px-4 py-4 sm:py-6 flex-wrap">
          <Button asChild variant="ghost" size="icon" className="hover:bg-brass/10 print:hidden">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gradient-brass print:text-[black] print:bg-none print:[-webkit-text-fill-color:black] truncate">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="mt-1 text-sm text-muted-foreground print:text-[#666] line-clamp-2">{recipe.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 print:hidden flex-wrap">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="border-brass/30 hover:border-brass/60 hover:bg-brass/10 transition-base"
              onClick={handleDuplicate}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Duplicate</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-brass/30 hover:border-brass/60 hover:bg-brass/10 transition-base"
              onClick={handlePrint}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button asChild variant="brass" size="sm">
              <Link to={`/recipe/${id}`}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-8 relative z-10">
        {/* Summary */}
        <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground font-mono-tech print:text-[#666] flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Total: {hours > 0 && `${hours}h `}{mins}min</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <span>{recipe.ingredients.length} ingredients</span>
          <span className="hidden sm:inline">•</span>
          <span>{recipe.steps.length} steps</span>
        </div>

        {/* Ingredients */}
        <Card className="card-glow border-brass/15 glass print:bg-[white] print:border-[#ddd] print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base text-gradient-brass print:text-[black] print:bg-none print:[-webkit-text-fill-color:black]">
              Ingredients
              {bakersPercentages.size > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground font-mono-tech">
                  (baker's %)
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 print:hidden">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1 flex-wrap">
                {[0.5, 1, 1.5, 2, 3].map((v) => (
                  <Button
                    key={v}
                    variant={scale === v ? "ghost-neon" : "outline"}
                    size="sm"
                    className={
                      scale === v
                        ? "h-7 px-2 text-xs bg-neon/20"
                        : "h-7 px-2 text-xs border-brass/20 hover:border-brass/50 hover:bg-brass/5 transition-base"
                    }
                    onClick={() => setScale(v)}
                  >
                    {v}×
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {scale !== 1 && (
              <p className="hidden print:block text-sm print:text-[#666] mb-2">Scaled: {scale}×</p>
            )}
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => {
                const rawAmount = parseFloat(ing.amount);
                const scaledAmount = !isNaN(rawAmount)
                  ? (rawAmount * scale).toFixed(scale === 1 ? 0 : 1).replace(/\.0$/, "")
                  : ing.amount;
                const pct = bakersPercentages.get(ing.id);

                return (
                  <li key={ing.id} className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-foreground font-mono-tech print:text-[black]">
                      {scaledAmount} {ing.unit}
                    </span>
                    <span className="text-muted-foreground print:text-[#444]">{ing.name}</span>
                    {pct && (
                      <span className="ml-auto text-xs text-neon font-mono-tech print:text-[#666]">
                        {pct}%
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Timetable Configuration */}
        <Card className="card-glow border-brass/15 glass print:bg-[white] print:border-[#ddd] print:shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-gradient-brass print:text-[black] print:bg-none print:[-webkit-text-fill-color:black]">
              Timetable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4 mb-6 print:hidden">
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
            </div>

            <div className="hidden print:block print:mb-4">
              <p className="text-sm print:text-[#444]">
                Ready: {readyDate} at {readyTime}
                {timeline.length > 0 && ` • Start at ${formatTime(timeline[0].startTime)}`}
              </p>
            </div>

            {recipe.steps.length > 0 && (
              <div className="relative space-y-0">
                <div className="absolute left-[23px] sm:left-[39px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-brass/40 via-neon/30 to-brass/40 print:bg-[#ccc]" />

                {timeline.map(({ step, startTime }) => (
                  <div key={step.id} className="relative flex gap-2 sm:gap-4 pb-4 group">
                    <div className="w-[48px] sm:w-[80px] shrink-0 pt-3 text-right">
                      <span className="text-xs sm:text-sm font-semibold font-mono-tech text-foreground print:text-[black]">
                        {formatTime(startTime)}
                      </span>
                    </div>
                    <div className="relative z-10 mt-3.5 shrink-0">
                      <div className="h-3 w-3 rounded-full border-2 border-neon bg-card shadow-[0_0_8px_hsl(157_100%_49%/0.5)] print:border-[#666] print:bg-[white] print:shadow-none" />
                    </div>
                    <div className="flex-1 pt-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground print:text-[black]">{step.name}</h3>
                        <span className="text-xs text-brass font-mono-tech print:text-[#666]">
                          ({formatDuration(step.durationMinutes)})
                        </span>
                      </div>
                      {step.instructions && (
                        <p className="mt-0.5 text-sm text-muted-foreground print:text-[#555]">
                          {step.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                <div className="relative flex gap-2 sm:gap-4">
                  <div className="w-[48px] sm:w-[80px] shrink-0 pt-3 text-right">
                    <span className="text-xs sm:text-sm font-bold font-mono-tech text-neon neon-glow print:text-[black] print:[text-shadow:none]">
                      {readyTime}
                    </span>
                  </div>
                  <div className="relative z-10 mt-3.5 shrink-0">
                    <div className="h-3 w-3 rounded-full bg-neon shadow-[0_0_12px_hsl(157_100%_49%/0.6)] print:bg-[black] print:shadow-none" />
                  </div>
                  <div className="pt-2.5">
                    <span className="text-base sm:text-lg font-bold text-gradient-neon print:text-[black] print:bg-none print:[-webkit-text-fill-color:black]">
                      🍞 Bread ready!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bake Log */}
        <BakeLog recipe={recipe} onUpdated={setRecipe} />
      </main>

      <footer className="hidden print:!block mt-8 pt-4 border-t border-[#ccc] text-[10pt] text-[#666]">
        <div className="flex justify-between">
          <span>{window.location.href}</span>
          <span>Printed {new Date().toLocaleDateString()}</span>
        </div>
      </footer>
    </div>
  );
};

export default RecipeDetail;
