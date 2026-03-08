import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Clock, Import, Trash2, Cog, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getRecipes, deleteRecipe, saveRecipe } from "@/lib/storage";
import { DEMO_RECIPES } from "@/lib/demo-recipes";
import { Recipe } from "@/types/recipe";

const SHOW_DEMO_BUTTON = import.meta.env.VITE_HIDE_DEMO_BUTTON !== "true";

const Index = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRecipes(getRecipes());
  }, []);

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalMinutes = (recipe: Recipe) =>
    recipe.steps.reduce((sum, s) => sum + s.durationMinutes, 0);

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handleDelete = (id: string) => {
    deleteRecipe(id);
    setRecipes(getRecipes());
  };

  const handleLoadDemos = () => {
    DEMO_RECIPES.forEach((r) => saveRecipe(r));
    setRecipes(getRecipes());
  };

  return (
    <div className="min-h-screen aurora-bg steampunk-bg noise-overlay mechanical-pattern relative overflow-hidden">
      {/* Decorative gears */}
      <div className="fixed top-[-60px] right-[-60px] opacity-[0.04] pointer-events-none">
        <Cog className="h-48 w-48 text-brass gear-slow" />
      </div>
      <div className="fixed bottom-[-40px] left-[-40px] opacity-[0.03] pointer-events-none">
        <Cog className="h-36 w-36 text-neon gear-reverse" />
      </div>

      <header className="relative border-b border-brass/20 bg-card/60 backdrop-blur-xl">
        <div className="absolute inset-x-0 bottom-0 divider-glow" />
        <div className="container mx-auto flex items-center justify-between px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Cog className="h-8 w-8 text-neon gear-slow" />
              <div className="absolute inset-0 h-8 w-8 rounded-full bg-neon/20 blur-md" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient-brass tracking-tight">
                Bread Planner
              </h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase">
                Recipes & Timetables
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {SHOW_DEMO_BUTTON && (
              <Button
                variant="outline"
                size="sm"
                className="border-neon/30 hover:border-neon/60 hover:bg-neon/10 text-neon transition-all duration-300"
                onClick={handleLoadDemos}
              >
                <FlaskConical className="mr-1 h-4 w-4" />
                Load Demos
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="border-brass/30 hover:border-brass/60 hover:bg-brass/10 transition-all duration-300">
              <Link to="/import">
                <Import className="mr-1 h-4 w-4" />
                Import
              </Link>
            </Button>
            <Button asChild size="sm" className="brass-shimmer text-primary-foreground font-semibold brass-glow hover:scale-105 transition-transform duration-300">
              <Link to="/recipe/new">
                <Plus className="mr-1 h-4 w-4" />
                Add Recipe
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        {recipes.length > 0 && (
          <div className="mb-8 max-w-sm">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-neon" />
              <Input
                placeholder="Search recipes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-brass/20 bg-card/50 backdrop-blur-sm focus-visible:ring-neon/40 focus-visible:border-neon/30 transition-all duration-300"
              />
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <Cog className="h-20 w-20 text-brass/30 gear-slow" />
              <Cog className="absolute top-6 left-12 h-12 w-12 text-neon/20 gear-reverse" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-gradient-brass">
              No recipes yet
            </h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              Fire up the workshop — add your first bread recipe or import one.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline" className="border-brass/30 hover:border-brass/60 transition-all duration-300">
                <Link to="/import">
                  <Import className="mr-1 h-4 w-4" />
                  Import Recipe
                </Link>
              </Button>
              <Button asChild className="brass-shimmer text-primary-foreground font-semibold brass-glow">
                <Link to="/recipe/new">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Recipe
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((recipe, i) => (
              <Card
                key={recipe.id}
                className="group card-glow card-hover border-brass/10 bg-card/50 backdrop-blur-md"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gradient-brass">{recipe.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {recipe.description || "No description"}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-neon" />
                      <span className="text-gradient-neon font-medium">
                        {formatDuration(totalMinutes(recipe))}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-brass/50" />
                      {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-brass/50" />
                      {recipe.steps.length} step{recipe.steps.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 pt-2 border-t border-border/50">
                  <Button asChild variant="outline" size="sm" className="flex-1 border-brass/20 hover:border-brass/50 hover:bg-brass/5 transition-all duration-300">
                    <Link to={`/recipe/${recipe.id}`}>Edit</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 hover:border-neon/40 neon-border transition-all duration-300">
                    <Link to={`/timetable/${recipe.id}`}>Timetable</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-brass/20 bg-card backdrop-blur-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-gradient-brass">Delete "{recipe.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This recipe and all its data will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-brass/20">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(recipe.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
