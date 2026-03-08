import { useState } from "react";
import { Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Desired Dough Temperature calculator.
 * DDT = Room + Flour + Water + (Friction factor)
 * Water temp = DDT × 3 − Room − Flour − Friction
 * For sourdough (with levain): DDT × 4 − Room − Flour − Levain − Friction
 */
export function DDTCalculator() {
  const [ddt, setDdt] = useState(24);
  const [roomTemp, setRoomTemp] = useState(22);
  const [flourTemp, setFlourTemp] = useState(22);
  const [friction, setFriction] = useState(2);

  const waterTemp = ddt * 3 - roomTemp - flourTemp - friction;

  return (
    <Card className="card-glow border-brass/15 glass print:bg-[white] print:border-[#ddd] print:shadow-none">
      <CardHeader>
        <CardTitle className="text-base text-gradient-brass print:text-[black] print:bg-none print:[-webkit-text-fill-color:black] flex items-center gap-2">
          <Thermometer className="h-4 w-4" />
          Water Temperature Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-mono-tech">
              Target DDT (°C)
            </Label>
            <Input
              type="number"
              value={ddt}
              onChange={(e) => setDdt(Number(e.target.value))}
              className="border-brass/20 bg-background/50 focus-visible:ring-neon/40 font-mono-tech"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-mono-tech">
              Room (°C)
            </Label>
            <Input
              type="number"
              value={roomTemp}
              onChange={(e) => setRoomTemp(Number(e.target.value))}
              className="border-brass/20 bg-background/50 focus-visible:ring-neon/40 font-mono-tech"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-mono-tech">
              Flour (°C)
            </Label>
            <Input
              type="number"
              value={flourTemp}
              onChange={(e) => setFlourTemp(Number(e.target.value))}
              className="border-brass/20 bg-background/50 focus-visible:ring-neon/40 font-mono-tech"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-mono-tech">
              Friction (°C)
            </Label>
            <Input
              type="number"
              value={friction}
              onChange={(e) => setFriction(Number(e.target.value))}
              className="border-brass/20 bg-background/50 focus-visible:ring-neon/40 font-mono-tech"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/30 px-4 py-3">
          <span className="text-sm text-muted-foreground">Use water at</span>
          <span
            className={`text-xl font-bold font-mono-tech ${
              waterTemp < 0 || waterTemp > 50 ? "text-destructive" : "text-neon neon-glow"
            }`}
          >
            {waterTemp.toFixed(1)}°C
          </span>
          {(waterTemp < 0 || waterTemp > 50) && (
            <span className="text-xs text-destructive">
              (out of practical range — adjust inputs)
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground font-mono-tech">
          Formula: Water = DDT×3 − Room − Flour − Friction
        </p>
      </CardContent>
    </Card>
  );
}
