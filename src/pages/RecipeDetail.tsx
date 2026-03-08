import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Printer, Clock, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecipe } from "@/lib/storage";
import { useEffect, useState } from "react";
import { Recipe } from "@/types/recipe";

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (id) {
      const r = getRecipe(id);
      if (r) {
        setRecipe(r);
      } else {
        navigate("/");
      }
    }
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

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
    <div className="min-h-screen aurora-bg steampunk-bg noise-overlay mechanical-pattern relative overflow-hidden print:bg-white print:text-black">
      <div className="fixed bottom-[-30px] right-[-30px] opacity-[0.03] pointer-events-none print:hidden">
        <Cog className="h-32 w-32 text-brass gear-slow" />
      </div>

      <header className="relative border-b border-brass/20 bg-card/60 backdrop-blur-xl print:bg-white print:border-gray-200">
        <div className="absolute inset-x-0 bottom-0 divider-glow print:hidden" />
        <div className="container mx-auto flex items-center gap-4 px-4 py-6">
          <Button asChild variant="ghost" size="icon" className="hover:bg-brass/10 print:hidden">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gradient-brass print:text-black print:bg-none print:[-webkit-text-fill-color:black]">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="mt-1 text-sm text-muted-foreground print:text-gray-600">{recipe.description}</p>
            )}
          </div>
          <div className="flex gap-2 print:hidden">
            <Button
              variant="outline"
              className="border-brass/30 hover:border-brass/60 hover:bg-brass/10"
              onClick={handlePrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button asChild className="bg-primary text-primary-foreground">
              <Link to={`/recipe/${id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8 relative z-10">
        {/* Summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground print:text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              Total: {hours > 0 && `${hours}h `}{mins}min
            </span>
          </div>
          <span>•</span>
          <span>{recipe.ingredients.length} ingredients</span>
          <span>•</span>
          <span>{recipe.steps.length} steps</span>
        </div>

        {/* Ingredients */}
        <Card className="card-glow border-brass/15 bg-card/50 backdrop-blur-md print:bg-white print:border-gray-200 print:shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-gradient-brass print:text-black print:bg-none print:[-webkit-text-fill-color:black]">
              Ingredients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex items-baseline gap-2">
                  <span className="font-medium text-foreground print:text-black">
                    {ing.amount} {ing.unit}
                  </span>
                  <span className="text-muted-foreground print:text-gray-700">{ing.name}</span>
                  {ing.percentage && (
                    <span className="ml-auto text-xs text-neon print:text-gray-500">
                      ({ing.percentage}%)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="card-glow border-brass/15 bg-card/50 backdrop-blur-md print:bg-white print:border-gray-200 print:shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-gradient-brass print:text-black print:bg-none print:[-webkit-text-fill-color:black]">
              Baking Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recipe.steps.map((step, i) => (
              <div
                key={step.id}
                className="flex gap-3 rounded-lg border border-brass/10 bg-muted/20 p-4 print:bg-gray-50 print:border-gray-200"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/15 border border-neon/30 text-xs font-bold text-neon print:bg-gray-200 print:border-gray-300 print:text-gray-700">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground print:text-black">{step.name}</h3>
                    {step.durationMinutes > 0 && (
                      <span className="text-xs text-brass print:text-gray-500">
                        ({step.durationMinutes} min)
                      </span>
                    )}
                  </div>
                  {step.instructions && (
                    <p className="mt-1 text-sm text-muted-foreground print:text-gray-600">
                      {step.instructions}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RecipeDetail;
