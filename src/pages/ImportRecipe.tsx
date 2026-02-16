import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveRecipe, generateId } from "@/lib/storage";
import { Recipe, Ingredient, BakingStep } from "@/types/recipe";
import { toast } from "sonner";

function parseRecipeText(text: string): { ingredients: Ingredient[]; steps: BakingStep[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const ingredients: Ingredient[] = [];
  const steps: BakingStep[] = [];

  let section: "unknown" | "ingredients" | "steps" = "unknown";

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect sections
    if (lower.includes("ingredient")) {
      section = "ingredients";
      continue;
    }
    if (
      lower.includes("instruction") ||
      lower.includes("direction") ||
      lower.includes("method") ||
      lower.includes("step")
    ) {
      section = "steps";
      continue;
    }

    if (section === "ingredients" || (section === "unknown" && /^\d/.test(line) && !lower.includes("min"))) {
      // Try to parse "500g flour" or "2 cups water" patterns
      const match = line.match(/^([\d./½¼¾⅓⅔]+)\s*([a-zA-Z]{1,5})?\s+(.+)/);
      if (match) {
        ingredients.push({
          id: generateId(),
          name: match[3].replace(/^(of\s+)/i, ""),
          amount: match[1],
          unit: match[2] || "",
        });
      } else {
        ingredients.push({
          id: generateId(),
          name: line.replace(/^[-•*]\s*/, ""),
          amount: "",
          unit: "",
        });
      }
    } else if (section === "steps") {
      // Try to extract duration
      const durationMatch = line.match(/(\d+)\s*(min|minute|hour|hr|h)/i);
      let durationMinutes = 0;
      if (durationMatch) {
        const val = parseInt(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        durationMinutes = unit.startsWith("h") ? val * 60 : val;
      }

      steps.push({
        id: generateId(),
        name: line.replace(/^\d+[.)]\s*/, "").slice(0, 50),
        durationMinutes,
        instructions: line.replace(/^\d+[.)]\s*/, ""),
      });
    }
  }

  return { ingredients, steps };
}

const ImportRecipe = () => {
  const navigate = useNavigate();
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<{
    ingredients: Ingredient[];
    steps: BakingStep[];
  } | null>(null);

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error("Paste a recipe first");
      return;
    }
    const result = parseRecipeText(rawText);
    if (result.ingredients.length === 0 && result.steps.length === 0) {
      toast.error("Couldn't parse the recipe. Try formatting with 'Ingredients' and 'Instructions' headers.");
      return;
    }
    setParsed(result);
    toast.success("Recipe parsed! Review below and save.");
  };

  const handleSave = () => {
    if (!parsed) return;

    const recipe: Recipe = {
      id: generateId(),
      name: "Imported Recipe",
      description: "Imported from text",
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveRecipe(recipe);
    toast.success("Recipe saved!");
    navigate(`/recipe/${recipe.id}`);
  };

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
            <h1 className="text-xl font-bold text-foreground">Import Recipe</h1>
            <p className="text-sm text-muted-foreground">
              Paste recipe text and we'll parse it for you
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paste Recipe Text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                Tip: Include "Ingredients" and "Instructions" headers for best results
              </Label>
              <Textarea
                placeholder={`Ingredients\n500g bread flour\n350ml water\n10g salt\n5g yeast\n\nInstructions\n1. Mix all ingredients — 10 min\n2. Bulk ferment — 2 hours\n3. Shape the dough — 15 min\n4. Final proof — 1 hour\n5. Bake at 230°C — 35 min`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={12}
                className="mt-2 font-mono text-sm"
              />
            </div>
            <Button onClick={handleParse} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Parse Recipe
            </Button>
          </CardContent>
        </Card>

        {parsed && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Parsed Ingredients ({parsed.ingredients.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {parsed.ingredients.map((ing) => (
                    <li key={ing.id} className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {ing.amount} {ing.unit}
                      </span>{" "}
                      {ing.name}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Parsed Steps ({parsed.steps.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {parsed.steps.map((step, i) => (
                    <li key={step.id} className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-foreground">{step.instructions}</span>
                        {step.durationMinutes > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({step.durationMinutes} min)
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Button onClick={handleSave} className="w-full" size="lg">
              Save & Edit Recipe
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default ImportRecipe;
