import { useMemo } from "react";
import { Droplets } from "lucide-react";
import { Ingredient } from "@/types/recipe";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FLOUR_KEYWORDS = ["flour", "mehl", "farine", "harina"];
const WATER_KEYWORDS = ["water", "wasser", "eau", "agua", "milk", "milch", "lait", "buttermilk"];

interface Props {
  ingredients: Ingredient[];
  scale?: number;
}

export function HydrationBadge({ ingredients, scale = 1 }: Props) {
  const hydration = useMemo(() => {
    const flourTotal = ingredients
      .filter((i) => FLOUR_KEYWORDS.some((kw) => i.name.toLowerCase().includes(kw)))
      .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) * scale;

    const waterTotal = ingredients
      .filter((i) => WATER_KEYWORDS.some((kw) => i.name.toLowerCase().includes(kw)))
      .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) * scale;

    if (flourTotal <= 0) return null;
    return ((waterTotal / flourTotal) * 100).toFixed(1);
  }, [ingredients, scale]);

  if (!hydration) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/50 px-2.5 py-0.5 text-xs font-semibold font-mono-tech text-accent-foreground print:bg-transparent print:text-[#444]">
          <Droplets className="h-3 w-3" />
          {hydration}%
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Dough hydration (water ÷ flour × 100)</p>
      </TooltipContent>
    </Tooltip>
  );
}
