import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, Cog, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecipe, saveRecipe, generateId } from "@/lib/storage";
import { Recipe, Ingredient, BakingStep } from "@/types/recipe";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableStep from "@/components/SortableStep";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const emptyIngredient = (): Ingredient => ({
  id: generateId(),
  name: "",
  amount: "",
  unit: "",
  percentage: "",
});

const emptyStep = (): BakingStep => ({
  id: generateId(),
  name: "",
  durationMinutes: 0,
  instructions: "",
});

// Common flour names for auto-detection
const FLOUR_KEYWORDS = ["flour", "mehl", "farine", "harina"];

const RecipeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<BakingStep[]>([emptyStep()]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleSave = useCallback(() => {
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
  }, [name, description, ingredients, steps, isNew, id, navigate]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "s", ctrl: true, handler: () => handleSave() },
  ], [handleSave]));

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const updateStep = useCallback((index: number, field: keyof BakingStep, value: string | number) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }, []);

  const deleteStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, j) => j !== index));
  }, []);

  const insertStepAt = useCallback((index: number) => {
    setSteps((prev) => [...prev.slice(0, index), emptyStep(), ...prev.slice(index)]);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Calculate baker's percentages based on total flour weight
  const calculateBakersPercentages = () => {
    const flourIngredients = ingredients.filter((ing) =>
      FLOUR_KEYWORDS.some((kw) => ing.name.toLowerCase().includes(kw))
    );

    if (flourIngredients.length === 0) {
      toast.error("No flour found! Add an ingredient with 'flour' in the name.");
      return;
    }

    const totalFlourWeight = flourIngredients.reduce((sum, ing) => {
      const amount = parseFloat(ing.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    if (totalFlourWeight <= 0) {
      toast.error("Flour weight must be greater than 0");
      return;
    }

    const updated = ingredients.map((ing) => {
      const amount = parseFloat(ing.amount);
      if (isNaN(amount) || amount <= 0) {
        return { ...ing, percentage: "" };
      }
      const percentage = ((amount / totalFlourWeight) * 100).toFixed(1);
      return { ...ing, percentage };
    });

    setIngredients(updated);
    toast.success(`Calculated percentages based on ${totalFlourWeight}g total flour`);
  };

  return (
    <div className="min-h-screen aurora-bg steampunk-bg noise-overlay mechanical-pattern relative overflow-hidden">
      <div className="fixed bottom-[-30px] right-[-30px] opacity-[0.03] pointer-events-none">
        <Cog className="h-32 w-32 text-brass gear-slow" />
      </div>

      <header className="relative border-b border-brass/20 glass-heavy">
        <div className="absolute inset-x-0 bottom-0 divider-glow" />
        <div className="container mx-auto flex items-center gap-4 px-4 py-6">
          <Button asChild variant="ghost" size="icon" className="hover:bg-brass/10">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gradient-brass">
              {isNew ? "New Recipe" : "Edit Recipe"}
            </h1>
          </div>
          <Button onClick={handleSave} variant="brass" className="hover:scale-105 transition-base">
            Save Recipe
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8 relative z-10">
        {/* Basic Info */}
        <Card className="card-glow border-brass/15 glass">
          <CardHeader>
            <CardTitle className="text-base text-gradient-brass">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">Recipe Name</Label>
              <Input
                id="name"
                placeholder="e.g. Sourdough Boule"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
              />
            </div>
            <div>
              <Label htmlFor="desc" className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">Description</Label>
              <Textarea
                id="desc"
                placeholder="A short description of the bread…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card className="card-glow border-brass/15 glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-gradient-brass">Ingredients</CardTitle>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost-neon"
                    size="sm"
                    onClick={calculateBakersPercentages}
                  >
                    <Calculator className="mr-1 h-3.5 w-3.5" />
                    Calc %
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Calculate baker's percentages (flour = 100%)</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                size="sm"
                className="border-brass/30 hover:border-brass/60 hover:bg-brass/10 transition-base"
                onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 font-mono-tech">
              <span className="w-4" />
              <span className="w-20">Amount</span>
              <span className="w-16">Unit</span>
              <span className="w-16">%</span>
              <span className="flex-1">Name</span>
            </div>
            {ingredients.map((ing, i) => (
              <div key={ing.id} className="flex items-center gap-2 group">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-brass/50 transition-base" />
                <Input
                  placeholder="Amt"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                  className="w-20 border-brass/15 bg-background/40 focus-visible:ring-neon/40"
                />
                <Input
                  placeholder="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                  className="w-16 border-brass/15 bg-background/40 focus-visible:ring-neon/40"
                />
                <Input
                  placeholder="%"
                  value={ing.percentage || ""}
                  onChange={(e) => updateIngredient(i, "percentage", e.target.value)}
                  className="w-16 border-brass/15 bg-background/40 focus-visible:ring-neon/40 text-neon font-mono-tech"
                  title="Baker's percentage"
                />
                <Input
                  placeholder="Ingredient name"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, "name", e.target.value)}
                  className="flex-1 border-brass/15 bg-background/40 focus-visible:ring-neon/40"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-base"
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

        {/* Steps with Drag & Drop */}
        <Card className="card-glow border-brass/15 glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-gradient-brass">Baking Steps</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="border-brass/30 hover:border-brass/60 hover:bg-brass/10 transition-base"
              onClick={() => setSteps((prev) => [...prev, emptyStep()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {steps.map((step, i) => (
                  <SortableStep
                    key={step.id}
                    step={step}
                    index={i}
                    isLast={i === steps.length - 1}
                    onUpdate={(field, value) => updateStep(i, field, value)}
                    onDelete={() => deleteStep(i)}
                    onInsertBefore={() => insertStepAt(i)}
                    onInsertAfter={() => insertStepAt(i + 1)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RecipeEditor;