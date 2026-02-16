import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Clock, Import, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecipes, deleteRecipe } from "@/lib/storage";
import { Recipe } from "@/types/recipe";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              🍞 Bread Planner
            </h1>
            <p className="text-sm text-muted-foreground">
              Your recipes & baking timetables
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/import">
                <Import className="mr-1 h-4 w-4" />
                Import
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/recipe/new">
                <Plus className="mr-1 h-4 w-4" />
                Add Recipe
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {recipes.length > 0 && (
          <div className="mb-6 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search recipes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-6xl">🥖</div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              No recipes yet
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Add your first bread recipe manually or import one from a website.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link to="/import">
                  <Import className="mr-1 h-4 w-4" />
                  Import Recipe
                </Link>
              </Button>
              <Button asChild>
                <Link to="/recipe/new">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Recipe
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((recipe) => (
              <Card
                key={recipe.id}
                className="group transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{recipe.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {recipe.description || "No description"}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(totalMinutes(recipe))}
                    </span>
                    <span>
                      {recipe.ingredients.length} ingredient
                      {recipe.ingredients.length !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {recipe.steps.length} step
                      {recipe.steps.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to={`/recipe/${recipe.id}`}>Edit</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link to={`/timetable/${recipe.id}`}>Timetable</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(recipe.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
