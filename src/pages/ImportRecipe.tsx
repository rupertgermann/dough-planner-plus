import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ImportedRecipeDraft,
  RecipeImportResponseSchema,
  RecipeImportSource,
} from "@/lib/import/import-schema";
import {
  createRecipeFromImportDraft,
  normalizeImportedRecipeDraft,
} from "@/lib/import/normalize-import";
import { quickParseRecipeText } from "@/lib/import/quick-parse";
import { saveRecipe } from "@/lib/storage";
import { PRESET_TAGS } from "@/types/recipe";
import { toast } from "sonner";

type ImportMode = "text" | "url";

const SOURCE_LABELS: Record<RecipeImportSource, string> = {
  ai: "AI",
  jsonld: "JSON-LD",
  "quick-parse": "Quick Parse",
};

function emptyIngredient() {
  return { name: "", amount: "", unit: "" };
}

function emptyStep() {
  return { name: "", durationMinutes: 0, instructions: "" };
}

const ImportRecipe = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ImportMode>("text");
  const [rawText, setRawText] = useState("");
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<ImportedRecipeDraft | null>(null);
  const [source, setSource] = useState<RecipeImportSource | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const applyImportResult = (nextDraft: ImportedRecipeDraft, nextSource: RecipeImportSource) => {
    setDraft(nextDraft);
    setSource(nextSource);
    setWarnings(nextDraft.warnings);
  };

  const handleQuickParse = () => {
    if (!rawText.trim()) {
      toast.error("Paste a recipe first.");
      return;
    }

    try {
      const parsedDraft = quickParseRecipeText(rawText);
      applyImportResult(parsedDraft, "quick-parse");
      toast.success("Quick parse complete. Review and save the draft.");
    } catch {
      toast.error("Quick parse could not find enough recipe structure.");
    }
  };

  const handleImportWithAI = async () => {
    const requestBody =
      mode === "text"
        ? { mode: "text" as const, text: rawText.trim() }
        : { mode: "url" as const, url: url.trim() };

    if (mode === "text" && !requestBody.text) {
      toast.error("Paste a recipe first.");
      return;
    }

    if (mode === "url" && !requestBody.url) {
      toast.error("Enter a recipe URL first.");
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch("/api/recipe-import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Recipe import failed.");
      }

      const result = RecipeImportResponseSchema.parse(payload);
      setDraft(result.recipe);
      setSource(result.source);
      setWarnings(result.warnings);

      toast.success(
        result.source === "jsonld"
          ? "Imported from structured recipe data."
          : result.source === "quick-parse"
            ? "AI import fell back to quick parse."
            : "AI import complete. Review and save the draft.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recipe import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const updateDraft = (recipeUpdater: (current: ImportedRecipeDraft) => ImportedRecipeDraft) => {
    setDraft((current) => (current ? recipeUpdater(current) : current));
  };

  const handleSave = () => {
    if (!draft) {
      return;
    }

    try {
      const normalizedDraft = normalizeImportedRecipeDraft(draft);
      const recipe = createRecipeFromImportDraft(normalizedDraft);
      saveRecipe(recipe);
      toast.success("Recipe saved.");
      navigate(`/recipe/${recipe.id}`);
    } catch {
      toast.error("The draft still needs at least one ingredient and one step.");
    }
  };

  return (
    <div className="min-h-screen aurora-bg steampunk-bg relative overflow-hidden">
      <header className="relative border-b border-brass/20 glass-heavy">
        <div className="absolute inset-x-0 bottom-0 divider-glow" />
        <div className="container mx-auto flex items-center gap-4 px-4 py-6">
          <Button asChild variant="ghost" size="icon" className="hover:bg-brass/10">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gradient-brass">Import Recipe</h1>
            <p className="text-xs text-muted-foreground tracking-widest uppercase font-mono-tech">
              Text or URL · AI import · Editable preview
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8 relative z-10">
        <Card className="card-glow border-brass/15 glass">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={mode === "text" ? "brass" : "outline"}
                onClick={() => setMode("text")}
              >
                Paste Text
              </Button>
              <Button
                type="button"
                variant={mode === "url" ? "brass" : "outline"}
                onClick={() => setMode("url")}
              >
                <Globe className="mr-2 h-4 w-4" />
                Import URL
              </Button>
            </div>
            <CardTitle className="text-base text-gradient-brass">
              {mode === "text" ? "Paste recipe text" : "Import a recipe page"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "text" ? (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-mono-tech">
                  Include ingredient and instruction headers when possible
                </Label>
                <Textarea
                  placeholder={`Ingredients\n500 g bread flour\n350 g water\n10 g salt\n5 g yeast\n\nInstructions\n1. Mix all ingredients - 10 min\n2. Bulk ferment - 2 hours\n3. Shape - 15 min\n4. Proof - 1 hour\n5. Bake at 230°C - 35 min`}
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  rows={14}
                  className="mt-2 font-mono-tech text-sm border-brass/15 bg-background/40 focus-visible:ring-neon/40"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label
                  htmlFor="recipe-url"
                  className="text-xs text-muted-foreground uppercase tracking-wider font-mono-tech"
                >
                  Recipe URL
                </Label>
                <Input
                  id="recipe-url"
                  placeholder="https://example.com/bread-recipe"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                />
                <p className="text-sm text-muted-foreground">
                  The page is fetched server-side, JSON-LD is preferred, and AI only runs when structured data is not enough.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleImportWithAI}
                variant="brass"
                className="sm:flex-1 hover:scale-[1.02] transition-base"
                disabled={isImporting}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isImporting ? "Importing..." : mode === "text" ? "Import with AI" : "Import from URL"}
              </Button>
              {mode === "text" && (
                <Button
                  onClick={handleQuickParse}
                  variant="outline"
                  className="sm:flex-1"
                  disabled={isImporting}
                >
                  Quick Parse
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {draft && (
          <>
            <Card className="card-glow border-brass/15 glass">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-base text-gradient-brass">Imported Draft</CardTitle>
                  {source && (
                    <Badge variant="outline" className="border-neon/40 text-neon">
                      Source: {SOURCE_LABELS[source]}
                    </Badge>
                  )}
                </div>
                {warnings.length > 0 && (
                  <div className="rounded-lg border border-brass/20 bg-background/30 p-3 text-sm text-muted-foreground">
                    {warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="draft-name">Recipe Name</Label>
                  <Input
                    id="draft-name"
                    value={draft.name}
                    onChange={(event) =>
                      updateDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="draft-description">Description</Label>
                  <Textarea
                    id="draft-description"
                    rows={3}
                    value={draft.description}
                    onChange={(event) =>
                      updateDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_TAGS.map((tag) => {
                      const active = draft.tags.includes(tag);

                      return (
                        <Badge
                          key={tag}
                          variant={active ? "default" : "outline"}
                          className={`cursor-pointer transition-base select-none ${
                            active
                              ? "bg-brass text-primary-foreground hover:bg-brass/80"
                              : "border-brass/30 text-muted-foreground hover:border-brass/60 hover:text-foreground"
                          }`}
                          onClick={() =>
                            updateDraft((current) => ({
                              ...current,
                              tags: active
                                ? current.tags.filter((currentTag) => currentTag !== tag)
                                : [...current.tags, tag],
                            }))
                          }
                        >
                          {tag}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-glow border-brass/15 glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base text-gradient-brass">
                  Ingredients ({draft.ingredients.length})
                </CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateDraft((current) => ({
                      ...current,
                      ingredients: [...current.ingredients, emptyIngredient()],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.ingredients.map((ingredient, index) => (
                  <div key={`${ingredient.name}-${index}`} className="grid gap-3 md:grid-cols-[120px_120px_1fr_auto]">
                    <Input
                      placeholder="Amount"
                      value={ingredient.amount}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          ingredients: current.ingredients.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, amount: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                    />
                    <Input
                      placeholder="Unit"
                      value={ingredient.unit}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          ingredients: current.ingredients.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, unit: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                    />
                    <Input
                      placeholder="Ingredient"
                      value={ingredient.name}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          ingredients: current.ingredients.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, name: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        updateDraft((current) => ({
                          ...current,
                          ingredients:
                            current.ingredients.length === 1
                              ? [emptyIngredient()]
                              : current.ingredients.filter((_, entryIndex) => entryIndex !== index),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="card-glow border-brass/15 glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base text-gradient-brass">
                  Steps ({draft.steps.length})
                </CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateDraft((current) => ({
                      ...current,
                      steps: [...current.steps, emptyStep()],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {draft.steps.map((step, index) => (
                  <div key={`${step.name}-${index}`} className="space-y-3 rounded-lg border border-brass/15 bg-background/20 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                      <Input
                        placeholder="Step name"
                        value={step.name}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            steps: current.steps.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, name: event.target.value }
                                : entry,
                            ),
                          }))
                        }
                        className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Minutes"
                        value={step.durationMinutes}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            steps: current.steps.map((entry, entryIndex) =>
                              entryIndex === index
                                ? {
                                    ...entry,
                                    durationMinutes: Number.parseInt(event.target.value || "0", 10) || 0,
                                  }
                                : entry,
                            ),
                          }))
                        }
                        className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateDraft((current) => ({
                            ...current,
                            steps:
                              current.steps.length === 1
                                ? [emptyStep()]
                                : current.steps.filter((_, entryIndex) => entryIndex !== index),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Instructions"
                      value={step.instructions}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          steps: current.steps.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, instructions: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button
              onClick={handleSave}
              variant="brass"
              size="lg"
              className="w-full hover:scale-[1.02] transition-base"
            >
              Save & Edit Recipe
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default ImportRecipe;
