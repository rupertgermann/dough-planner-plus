import { useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BakeLogEntry, Recipe } from "@/types/recipe";
import { generateId, saveRecipe } from "@/lib/storage";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BakeLogProps {
  recipe: Recipe;
  onUpdated: (recipe: Recipe) => void;
}

const StarRating = ({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 transition-base ${
          star <= value
            ? "fill-brass text-brass"
            : "text-muted-foreground/30"
        } ${!readonly ? "cursor-pointer hover:text-brass" : ""}`}
        onClick={() => !readonly && onChange?.(star)}
      />
    ))}
  </div>
);

export function BakeLog({ recipe, onUpdated }: BakeLogProps) {
  const [adding, setAdding] = useState(false);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState("");
  const [changes, setChanges] = useState("");

  const entries = recipe.bakeLog || [];

  const handleAdd = () => {
    if (!notes.trim()) {
      toast.error("Please add some notes about your bake");
      return;
    }
    const entry: BakeLogEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      rating,
      notes: notes.trim(),
      changes: changes.trim(),
    };
    const updated = {
      ...recipe,
      bakeLog: [entry, ...entries],
    };
    saveRecipe(updated);
    onUpdated(updated);
    setAdding(false);
    setNotes("");
    setChanges("");
    setRating(4);
    toast.success("Bake logged!");
  };

  const handleDelete = (entryId: string) => {
    const updated = {
      ...recipe,
      bakeLog: entries.filter((e) => e.id !== entryId),
    };
    saveRecipe(updated);
    onUpdated(updated);
    toast.success("Entry removed");
  };

  return (
    <Card className="card-glow border-brass/15 glass print:bg-[white] print:border-[#ddd] print:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base text-gradient-brass print:text-[black] print:bg-none print:[-webkit-text-fill-color:black]">
          Bake Log
        </CardTitle>
        {!adding && (
          <Button
            variant="outline"
            size="sm"
            className="border-brass/30 hover:border-brass/60 hover:bg-brass/10 transition-base print:hidden"
            onClick={() => setAdding(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Log a Bake
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="space-y-3 p-4 rounded-lg border border-neon/20 bg-neon/5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                Rating
              </Label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                Notes
              </Label>
              <Textarea
                placeholder="How did this bake go? Crumb, crust, flavor…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                What I'd change next time
              </Label>
              <Textarea
                placeholder="Less hydration, longer bulk, etc."
                value={changes}
                onChange={(e) => setChanges(e.target.value)}
                rows={2}
                className="border-brass/20 bg-background/50 focus-visible:ring-neon/40"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="brass" size="sm" onClick={handleAdd}>
                Save Entry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAdding(false);
                  setNotes("");
                  setChanges("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {entries.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No bakes logged yet. Track your progress by logging each attempt!
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="group relative p-3 rounded-lg border border-brass/10 bg-card/40 space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono-tech">
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <StarRating value={entry.rating} readonly />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-base print:hidden"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-brass/20 glass-heavy">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this log entry?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-brass/20">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(entry.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <p className="text-sm text-foreground">{entry.notes}</p>
              {entry.changes && (
                <p className="text-xs text-neon font-mono-tech">
                  ↻ {entry.changes}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
