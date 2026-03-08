import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BakingStep } from "@/types/recipe";

interface SortableStepProps {
  step: BakingStep;
  index: number;
  isLast: boolean;
  onUpdate: (field: keyof BakingStep, value: string | number) => void;
  onDelete: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
}

const SortableStep = ({
  step,
  index,
  isLast,
  onUpdate,
  onDelete,
  onInsertBefore,
  onInsertAfter,
}: SortableStepProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      {/* Insert before button */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-neon hover:bg-neon/10 transition-all duration-300"
          onClick={onInsertBefore}
        >
          <Plus className="mr-1 h-3 w-3" />
          Insert above
        </Button>
      </div>

      <div className="flex gap-3 rounded-lg border border-brass/10 bg-muted/20 p-4 backdrop-blur-sm card-hover">
        <div
          {...attributes}
          {...listeners}
          className="flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/15 border border-neon/30 text-xs font-bold text-neon neon-border">
            {index + 1}
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground/50 hover:text-brass/70 transition-colors" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Step name (e.g. Bulk ferment)"
              value={step.name}
              onChange={(e) => onUpdate("name", e.target.value)}
              className="flex-1 border-brass/15 bg-background/40 focus-visible:ring-neon/40"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Min"
                value={step.durationMinutes || ""}
                onChange={(e) =>
                  onUpdate("durationMinutes", parseInt(e.target.value) || 0)
                }
                className="w-20 border-brass/15 bg-background/40 focus-visible:ring-neon/40"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
          <Textarea
            placeholder="Instructions for this step…"
            value={step.instructions}
            onChange={(e) => onUpdate("instructions", e.target.value)}
            rows={2}
            className="text-sm border-brass/15 bg-background/40 focus-visible:ring-neon/40"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Insert after button (only on last item) */}
      {isLast && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-neon hover:bg-neon/10 transition-all duration-300"
            onClick={onInsertAfter}
          >
            <Plus className="mr-1 h-3 w-3" />
            Insert below
          </Button>
        </div>
      )}
    </div>
  );
};

export default SortableStep;
