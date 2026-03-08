import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Clock, Import, Trash2, Wheat, FlaskConical, ArrowUpDown, Pencil, CalendarClock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportImportDialog } from "@/components/ExportImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getRecipes, deleteRecipe, saveRecipe } from "@/lib/storage";
import { DEMO_RECIPES } from "@/lib/demo-recipes";
import { Recipe, PRESET_TAGS } from "@/types/recipe";

const SHOW_DEMO_BUTTON = import.meta.env.VITE_HIDE_DEMO_BUTTON !== "true";

type SortKey = "name" | "duration" | "created" | "updated";

const totalMinutes = (recipe: Recipe) =>
  recipe.steps.reduce((sum, s) => sum + s.durationMinutes, 0);

const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const Index = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("name");

  useEffect(() => {
    setRecipes(getRecipes());
  }, []);

  // Collect all tags used across recipes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach((r) => (r.tags || []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [recipes]);

  const filtered = useMemo(() => {
    let result = recipes;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q));
    }

    if (activeTag) {
      result = result.filter((r) => (r.tags || []).includes(activeTag));
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "duration":
          return totalMinutes(a) - totalMinutes(b);
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "updated":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [recipes, search, activeTag, sortBy]);

  const handleDelete = (id: string) => {
    deleteRecipe(id);
    setRecipes(getRecipes());
  };

  const handleLoadDemos = () => {
    DEMO_RECIPES.forEach((r) => saveRecipe(r));
    setRecipes(getRecipes());
  };

  const btnOutlineClass = "border-brass/20 hover:border-brass/50 hover:bg-brass/5 hover:text-foreground transition-base";

  return (
    <div className="min-h-screen aurora-bg steampunk-bg noise-overlay mechanical-pattern relative overflow-hidden">
      {/* Decorative gears */}
      <div className="fixed top-[-60px] right-[-60px] opacity-[0.04] pointer-events-none">
        <Cog className="h-48 w-48 text-brass gear-slow" />
      </div>
      <div className="fixed bottom-[-40px] left-[-40px] opacity-[0.03] pointer-events-none">
        <Cog className="h-36 w-36 text-neon gear-reverse" />
      </div>

      <header className="relative border-b border-brass/20 glass-heavy">
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
              <p className="text-xs text-muted-foreground tracking-widest uppercase font-mono-tech">
                Recipes & Timetables
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {SHOW_DEMO_BUTTON && (
              <Button variant="ghost-neon" size="sm" onClick={handleLoadDemos}>
                <FlaskConical className="mr-1 h-4 w-4" />
                Load Demos
              </Button>
            )}
            <ExportImportDialog onImported={() => setRecipes(getRecipes())} />
            <Button asChild variant="outline" size="sm" className={btnOutlineClass}>
              <Link to="/import">
                <Import className="mr-1 h-4 w-4" />
                Import
              </Link>
            </Button>
            <Button asChild variant="brass" size="sm" className="hover:scale-105 transition-base">
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
          <div className="mb-6 space-y-4">
            {/* Search + Sort row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative group max-w-sm flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-base group-focus-within:text-neon" />
                <Input
                  placeholder="Search recipes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 border-brass/20 bg-card/50 backdrop-blur-sm focus-visible:ring-neon/40 focus-visible:border-neon/30 transition-base"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-[160px] border-brass/20 bg-card/50 backdrop-blur-sm">
                  <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-brass/20 glass-heavy">
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="created">Newest first</SelectItem>
                  <SelectItem value="updated">Last updated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tag filter chips */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={activeTag === null ? "default" : "outline"}
                  className={`cursor-pointer transition-base select-none ${
                    activeTag === null
                      ? "bg-brass text-primary-foreground"
                      : "border-brass/30 text-muted-foreground hover:border-brass/60 hover:text-foreground"
                  }`}
                  onClick={() => setActiveTag(null)}
                >
                  All
                </Badge>
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={activeTag === tag ? "default" : "outline"}
                    className={`cursor-pointer transition-base select-none ${
                      activeTag === tag
                        ? "bg-brass text-primary-foreground"
                        : "border-brass/30 text-muted-foreground hover:border-brass/60 hover:text-foreground"
                    }`}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <Cog className="h-20 w-20 text-brass/30 gear-slow" />
              <Cog className="absolute top-6 left-12 h-12 w-12 text-neon/20 gear-reverse" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-gradient-brass">
              {recipes.length > 0 ? "No matches" : "No recipes yet"}
            </h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              {recipes.length > 0
                ? "Try a different search or filter."
                : "Fire up the workshop — add your first bread recipe or import one."}
            </p>
            {recipes.length === 0 && (
              <div className="flex gap-3">
                <Button asChild variant="outline" className={`${btnOutlineClass} border-brass/30`}>
                  <Link to="/import">
                    <Import className="mr-1 h-4 w-4" />
                    Import Recipe
                  </Link>
                </Button>
                <Button asChild variant="brass">
                  <Link to="/recipe/new">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Recipe
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((recipe, i) => (
              <Link to={`/view/${recipe.id}`} className="block" key={recipe.id}>
                <Card
                  className="group card-glow card-hover border-brass/10 glass cursor-pointer"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-gradient-brass">{recipe.name}</CardTitle>
                    {(recipe.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recipe.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-brass/25 text-muted-foreground font-mono-tech"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {recipe.description || "No description"}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-mono-tech">
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
                      <TooltipProvider delayDuration={300}>
                        <span className="ml-auto flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-brass/10 transition-base">
                                <Link to={`/recipe/${recipe.id}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-neon hover:bg-neon/10 transition-base">
                                <Link to={`/timetable/${recipe.id}`}>
                                  <CalendarClock className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Timetable</p></TooltipContent>
                          </Tooltip>
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-base"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete</p></TooltipContent>
                            </Tooltip>
                            <AlertDialogContent className="border-brass/20 glass-heavy">
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
                        </span>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
