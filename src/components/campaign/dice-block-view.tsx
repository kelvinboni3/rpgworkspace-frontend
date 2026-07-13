import { useEffect, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CharacterTabBlock } from "@/services/character-tab-block-service";
import { parseDiceNotation, rollDice, type DiceRoll } from "@/utils/dice";
import { cn } from "@/utils/cn";

const QUICK_DICE = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];
const ANIMATION_TICKS = 10;
const ANIMATION_INTERVAL_MS = 60;

export function DiceBlockView({ block }: { block: CharacterTabBlock }) {
  const [notation, setNotation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [displayTotal, setDisplayTotal] = useState<number | null>(null);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  const roll = (value: string) => {
    const parsed = parseDiceNotation(value);
    if (!parsed) {
      setError("Notação inválida (ex.: d20, 2d6+3)");
      return;
    }

    setError(null);
    setLastRoll(null);
    setIsRolling(true);

    if (intervalRef.current) clearInterval(intervalRef.current);

    const min = parsed.count * 1 + parsed.modifier;
    const max = parsed.count * parsed.sides + parsed.modifier;

    let ticks = 0;
    intervalRef.current = setInterval(() => {
      setDisplayTotal(Math.floor(Math.random() * (max - min + 1)) + min);
      ticks += 1;

      if (ticks >= ANIMATION_TICKS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;

        const result = rollDice(value);
        if (result) {
          setDisplayTotal(result.total);
          setLastRoll(result);
        }
        setIsRolling(false);
      }
    }, ANIMATION_INTERVAL_MS);
  };

  return (
    <div className="bg-card/40 border-border/60 space-y-3 border px-4 py-3">
      {block.title && <div className="font-display text-primary text-sm">{block.title}</div>}

      {block.content && (
        <Button type="button" className="w-full" disabled={isRolling} onClick={() => roll(block.content!)}>
          <Dices className={cn("size-4", isRolling && "animate-spin")} />
          Rolar {block.content}
        </Button>
      )}

      {displayTotal !== null && (
        <div className="text-center">
          <div
            className={cn(
              "font-display text-primary text-4xl font-bold transition-transform duration-150",
              isRolling && "scale-95",
            )}
          >
            {displayTotal}
          </div>
          {lastRoll && !isRolling && (
            <p className="dossier-meta text-xs">
              {lastRoll.notation}
              {lastRoll.rolls.length > 1 || lastRoll.modifier !== 0
                ? ` · rolagem: ${lastRoll.rolls.join(", ")}${
                    lastRoll.modifier !== 0
                      ? lastRoll.modifier > 0
                        ? ` +${lastRoll.modifier}`
                        : ` ${lastRoll.modifier}`
                      : ""
                  }`
                : ""}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {QUICK_DICE.map((die) => (
          <button
            key={die}
            type="button"
            disabled={isRolling}
            onClick={() => roll(die)}
            className="border-border/60 hover:bg-accent/10 hover:text-foreground text-muted-foreground border px-2 py-1.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {die}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              roll(notation);
            }
          }}
          placeholder="Notação livre: 2d6+3"
          className="h-8 flex-1 text-xs"
          disabled={isRolling}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRolling || !notation}
          onClick={() => roll(notation)}
        >
          Rolar
        </Button>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
