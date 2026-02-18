import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecipe, saveRecipe, generateId } from "@/lib/storage";
import { Recipe, Ingredient, BakingStep } from "@/types/recipe";
import { toast } from "sonner";

const emptyIngredient = (): Ingredient => ({
  id: generateId(),
  name: "",
  amount: "",
  unit: "",
});

const emptyStep = (): BakingStep => ({
  id: generateId(),
  name: "",
  durationMinutes: 0,
  instructions: "",
});

const RecipeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<BakingStep[]>([emptyStep()]);

  useEffect(() => {
    if (!isNew && id) {
      const recipe = getRecipe(id);
      if (recipe) {
        setName(recipe.name);
        setDescription(recipe.description);
        setIngredients(recipe.ingredients.length ? recipe.ingredients : [emptyIngredient()]);
        setSteps(recipe.steps.length ? recipe.steps : [emptyStep()]);
      } else {
        navigate("/");
      }
    }
  }, [id, isNew, navigate]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a recipe name");
      return;
    }

    const recipe: Recipe = {
      id: isNew ? generateId() : id!,
      name: name.trim(),
      description: description.trim(),
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.name.trim()),
      createdAt: isNew ? new Date().toISOString() : getRecipe(id!)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveRecipe(recipe);
    toast.success(isNew ? "Recipe created!" : "Recipe updated!");
    navigate("/");
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const updateStep = (index: number, field: keyof BakingStep, value: string | number) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div className="min-h-screen bg-background steampunk-bg">
      <header className="border-b border-brass/20 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center gap-4 px-4 py-5">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-brass">
              {isNew ? "New Recipe" : "Edit Recipe"}
            </h1>
          </div>
          <Button onClick={handleSave} className="bg-brass text-background hover:bg-brass/80 brass-glow">Save Recipe</Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Basic Info */}
        <Card className="border-brass/20 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Recipe Name</Label>
              <Input
                id="name"
                placeholder="e.g. Sourdough Boule"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="A short description of the bread…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card className="border-brass/20 bg-card/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ingredients</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {ingredients.map((ing, i) => (
              <div key={ing.id} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                <Input
                  placeholder="Amount"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                  className="w-20"
                />
                <Input
                  placeholder="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                  className="w-16"
                />
                <Input
                  placeholder="Ingredient name"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, "name", e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setIngredients((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="border-brass/20 bg-card/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Baking Steps</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSteps((prev) => [...prev, emptyStep()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className="flex gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon/20 border border-neon/40 text-xs font-bold text-neon">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Step name (e.g. Bulk ferment)"
                      value={step.name}
                      onChange={(e) => updateStep(i, "name", e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={step.durationMinutes || ""}
                        onChange={(e) =>
                          updateStep(i, "durationMinutes", parseInt(e.target.value) || 0)
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Instructions for this step…"
                    value={step.instructions}
                    onChange={(e) => updateStep(i, "instructions", e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RecipeEditor;
