import { useState, useMemo, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Ingredient } from "@/types/recipe";

const COST_STORAGE_KEY = "bread-planner-ingredient-costs";

interface Props {
  ingredients: Ingredient[];
  scale: number;
  recipeId: string;
}

type CostMap = Record<string, number>; // ingredient name (lowered) → cost per unit

function loadCosts(): CostMap {
  try {
    return JSON.parse(localStorage.getItem(COST_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCosts(costs: CostMap) {
  localStorage.setItem(COST_STORAGE_KEY, JSON.stringify(costs));
}

export function BatchCost({ ingredients, scale }: Props) {
  const [costs, setCosts] = useState<CostMap>(loadCosts);

  useEffect(() => {
    saveCosts(costs);
  }, [costs]);

  const setCost = (name: string, value: string) => {
    const num = parseFloat(value);
    setCosts((prev) => ({
      ...prev,
      [name.toLowerCase()]: isNaN(num) ? 0 : num,
    }));
  };

  const totalCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const amount = parseFloat(ing.amount) || 0;
      const unitCost = costs[ing.name.toLowerCase()] || 0;
      return sum + amount * scale * unitCost;
    }, 0);
  }, [ingredients, costs, scale]);

  const hasAnyCost = Object.values(costs).some((v) => v > 0);

  return (
    <Card className="card-glow border-brass/15 glass print:bg-[white] print:border-[#ddd] print:shadow-none">
      <CardHeader>
        <CardTitle className="text-base text-gradient-brass print:text-[black] print:bg-none print:[-webkit-text-fill-color:black] flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Batch Cost
          {scale !== 1 && (
            <span className="text-xs font-normal text-muted-foreground font-mono-tech">
              ({scale}×)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_80px_90px] gap-2 text-xs text-muted-foreground uppercase tracking-wider font-mono-tech">
            <span>Ingredient</span>
            <span>Cost/unit</span>
            <span className="text-right">Subtotal</span>
          </div>
          {ingredients.map((ing) => {
            const amount = parseFloat(ing.amount) || 0;
            const unitCost = costs[ing.name.toLowerCase()] || 0;
            const subtotal = amount * scale * unitCost;

            return (
              <div
                key={ing.id}
                className="grid grid-cols-[1fr_80px_90px] gap-2 items-center"
              >
                <span className="text-sm text-muted-foreground truncate">
                  {ing.name}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costs[ing.name.toLowerCase()] || ""}
                  onChange={(e) => setCost(ing.name, e.target.value)}
                  className="h-7 text-xs border-brass/20 bg-background/50 focus-visible:ring-neon/40 font-mono-tech"
                />
                <span className="text-sm font-mono-tech text-right text-foreground">
                  {subtotal > 0 ? subtotal.toFixed(2) : "—"}
                </span>
              </div>
            );
          })}
        </div>
        {hasAnyCost && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-accent/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">Total cost</span>
            <span className="text-xl font-bold font-mono-tech text-neon neon-glow">
              {totalCost.toFixed(2)}
            </span>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground font-mono-tech">
          Enter cost per unit ({ingredients[0]?.unit || "unit"}) for each ingredient. Costs are saved globally.
        </p>
      </CardContent>
    </Card>
  );
}
