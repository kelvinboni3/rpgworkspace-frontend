import { useState } from "react";
import { EditFormActions } from "@/components/campaign/character-tab-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CharacterTabBlock, UpdateCharacterTabBlockRequest } from "@/services/character-tab-block-service";
import { parseDiceNotation } from "@/utils/dice";

export function DiceEditForm({
  block,
  onSubmit,
  onCancel,
  isSaving,
}: {
  block: CharacterTabBlock;
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(block.title ?? "");
  const [notation, setNotation] = useState(block.content ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (notation && !parseDiceNotation(notation)) {
          setError("Notação inválida (ex.: d20, 2d6+3)");
          return;
        }
        setError(null);
        onSubmit({ title: title || null, content: notation || null });
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label className="text-xs">Rótulo</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ataque com espada" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notação padrão (opcional)</Label>
        <Input value={notation} onChange={(e) => setNotation(e.target.value)} placeholder="Ex.: d20+5" />
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
      <EditFormActions onCancel={onCancel} isSaving={isSaving} />
    </form>
  );
}
