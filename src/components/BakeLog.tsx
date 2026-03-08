import { useState, useRef, useCallback } from "react";
import { Plus, Star, Trash2, Camera, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

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
          star <= value ? "fill-brass text-brass" : "text-muted-foreground/30"
        } ${!readonly ? "cursor-pointer hover:text-brass" : ""}`}
        onClick={() => !readonly && onChange?.(star)}
      />
    ))}
  </div>
);

const CRUST_OPTIONS = ["Pale", "Light golden", "Golden", "Deep golden", "Dark / caramelised"];
const MAX_PHOTO_WIDTH = 800;
const MAX_PHOTOS = 4;

/** Resize an image file to a max-width base64 JPEG */
function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function BakeLog({ recipe, onUpdated }: BakeLogProps) {
  const [adding, setAdding] = useState(false);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState("");
  const [changes, setChanges] = useState("");
  const [crumbRating, setCrumbRating] = useState(3);
  const [crustColor, setCrustColor] = useState("");
  const [ovenSpring, setOvenSpring] = useState(3);
  const [photos, setPhotos] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const entries = recipe.bakeLog || [];

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const remaining = MAX_PHOTOS - photos.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_PHOTOS} photos per entry`);
        return;
      }
      const toProcess = files.slice(0, remaining);
      try {
        const resized = await Promise.all(
          toProcess.map((f) => resizeImage(f, MAX_PHOTO_WIDTH))
        );
        setPhotos((prev) => [...prev, ...resized]);
      } catch {
        toast.error("Failed to process image");
      }
      if (fileRef.current) fileRef.current.value = "";
    },
    [photos.length]
  );

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

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
      crumbRating,
      crustColor: crustColor || undefined,
      ovenSpring,
      photos: photos.length > 0 ? photos : undefined,
    };
    const updated = {
      ...recipe,
      bakeLog: [entry, ...entries],
    };
    try {
      saveRecipe(updated);
      onUpdated(updated);
      setAdding(false);
      resetForm();
      toast.success("Bake logged!");
    } catch {
      toast.error("Storage full — try removing old photos or entries");
    }
  };

  const resetForm = () => {
    setNotes("");
    setChanges("");
    setRating(4);
    setCrumbRating(3);
    setCrustColor("");
    setOvenSpring(3);
    setPhotos([]);
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
    <>
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
              {/* Overall rating */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                  Overall Rating
                </Label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              {/* Crumb, Crust, Oven Spring row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                    Crumb
                  </Label>
                  <StarRating value={crumbRating} onChange={setCrumbRating} />
                  <span className="text-[10px] text-muted-foreground font-mono-tech">
                    {crumbRating <= 2 ? "Dense / tight" : crumbRating <= 3 ? "Decent" : "Open & airy"}
                  </span>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                    Oven Spring
                  </Label>
                  <StarRating value={ovenSpring} onChange={setOvenSpring} />
                  <span className="text-[10px] text-muted-foreground font-mono-tech">
                    {ovenSpring <= 2 ? "Flat" : ovenSpring <= 3 ? "Moderate" : "Great rise"}
                  </span>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                    Crust Color
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {CRUST_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={crustColor === opt ? "ghost-neon" : "outline"}
                        size="sm"
                        className={
                          crustColor === opt
                            ? "h-6 px-2 text-[10px] bg-neon/20"
                            : "h-6 px-2 text-[10px] border-brass/20 hover:border-brass/50 hover:bg-brass/5 transition-base"
                        }
                        onClick={() => setCrustColor(crustColor === opt ? "" : opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                  Photos ({photos.length}/{MAX_PHOTOS})
                </Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {photos.map((src, i) => (
                    <div key={i} className="relative group/photo">
                      <img
                        src={src}
                        alt={`Bake photo ${i + 1}`}
                        className="h-20 w-20 object-cover rounded-md border border-brass/20 cursor-pointer"
                        onClick={() => setLightboxSrc(src)}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <>
                      <button
                        type="button"
                        onClick={() => cameraRef.current?.click()}
                        className="h-20 w-20 rounded-md border-2 border-dashed border-neon/30 hover:border-neon/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-base"
                      >
                        <Camera className="h-5 w-5" />
                        <span className="text-[9px] font-mono-tech">Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="h-20 w-20 rounded-md border-2 border-dashed border-brass/30 hover:border-brass/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-base"
                      >
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-[9px] font-mono-tech">Gallery</span>
                      </button>
                    </>
                  )}
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono-tech">
                  Notes
                </Label>
                <Textarea
                  placeholder="How did this bake go? Flavor, texture, aroma…"
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
                    resetForm();
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
                className="group relative p-3 rounded-lg border border-brass/10 bg-card/40 space-y-1.5"
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

                {/* Photos */}
                {entry.photos && entry.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entry.photos.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Bake photo ${i + 1}`}
                        className="h-24 w-24 sm:h-32 sm:w-32 object-cover rounded-md border border-brass/20 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxSrc(src)}
                      />
                    ))}
                  </div>
                )}

                {/* Scoring badges */}
                {(entry.crumbRating || entry.ovenSpring || entry.crustColor) && (
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono-tech">
                    {entry.crumbRating && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/40 px-2 py-0.5 text-accent-foreground">
                        Crumb {entry.crumbRating}/5
                      </span>
                    )}
                    {entry.ovenSpring && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/40 px-2 py-0.5 text-accent-foreground">
                        Spring {entry.ovenSpring}/5
                      </span>
                    )}
                    {entry.crustColor && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/40 px-2 py-0.5 text-accent-foreground">
                        Crust: {entry.crustColor}
                      </span>
                    )}
                  </div>
                )}

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

      {/* Lightbox */}
      <Dialog open={!!lightboxSrc} onOpenChange={() => setLightboxSrc(null)}>
        <DialogContent className="max-w-3xl border-brass/20 glass-heavy p-2">
          <DialogTitle className="sr-only">Photo preview</DialogTitle>
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt="Bake photo full size"
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
