import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Hash, Volume2 } from "lucide-react";
import { useNavigate } from "react-router";
import { TavernaDialog } from "@/components/taverna/taverna-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CommunityService,
  communityKeys,
  type CommunityChannel,
  type CommunityChannelType,
} from "@/services/community-service";
import { paths } from "@/routes/paths";
import { extractErrorMessage } from "@/utils/api-error";
import { cn } from "@/utils/cn";

type ChannelDialogProps = {
  /** Sem canal = criação. */
  channel?: CommunityChannel;
  defaultCategory?: string;
  defaultType?: CommunityChannelType;
  categories: string[];
  onClose: () => void;
};

export function ChannelDialog({ channel, defaultCategory, defaultType, categories, onClose }: ChannelDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isEdit = Boolean(channel);

  const [name, setName] = useState(channel?.name ?? "");
  const [type, setType] = useState<CommunityChannelType>(channel?.type ?? defaultType ?? "Text");
  const [category, setCategory] = useState(channel?.category ?? defaultCategory ?? categories[0] ?? "Texto");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [position, setPosition] = useState(channel?.position ?? 0);
  const [isReadOnly, setIsReadOnly] = useState(channel?.isReadOnly ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      channel
        ? CommunityService.updateChannel(channel.id, {
            name: name.trim(),
            category: category.trim(),
            topic: topic.trim() || null,
            position,
            isReadOnly,
          })
        : CommunityService.createChannel({
            name: name.trim(),
            type,
            category: category.trim(),
            topic: topic.trim() || null,
            isReadOnly,
          }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: communityKeys.channels });
      if (!channel) navigate(paths.tavernaChannel(saved.id));
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => CommunityService.deleteChannel(channel!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: communityKeys.channels });
      navigate(paths.taverna);
      onClose();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !category.trim()) return;
    saveMutation.mutate();
  };

  const error = saveMutation.error ?? deleteMutation.error;

  return (
    <TavernaDialog title={isEdit ? "Editar canal" : "Novo canal"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isEdit && (
          <div className="grid grid-cols-2 gap-2">
            {(["Text", "Voice"] as const).map((option) => {
              const Icon = option === "Text" ? Hash : Volume2;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    type === option
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {option === "Text" ? "Texto" : "Voz"}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="channel-name">Nome</Label>
          <Input
            id="channel-name"
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.target.value)}
            placeholder={type === "Text" ? "ex.: memes" : "ex.: sessão de sexta"}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="channel-category">Categoria</Label>
          <Input
            id="channel-category"
            value={category}
            maxLength={50}
            list="taverna-categories"
            onChange={(event) => setCategory(event.target.value)}
          />
          <datalist id="taverna-categories">
            {categories.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        {type === "Text" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="channel-topic">Tópico (opcional)</Label>
              <Input
                id="channel-topic"
                value={topic}
                maxLength={200}
                onChange={(event) => setTopic(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isReadOnly}
                onChange={(event) => setIsReadOnly(event.target.checked)}
                className="accent-primary size-4"
              />
              Só administradores podem escrever (avisos, regras)
            </label>
          </>
        )}

        {isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel-position">Posição (menor aparece primeiro)</Label>
            <Input
              id="channel-position"
              type="number"
              min={0}
              value={position}
              onChange={(event) => setPosition(Number(event.target.value) || 0)}
            />
          </div>
        )}

        {error && <p className="text-destructive text-sm">{extractErrorMessage(error)}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-destructive text-xs">Apagar com todas as mensagens?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  Apagar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Não
                </Button>
              </div>
            ) : (
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                Apagar canal
              </Button>
            )
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saveMutation.isPending || !name.trim() || !category.trim()}>
            {isEdit ? "Salvar" : "Criar canal"}
          </Button>
        </div>
      </form>
    </TavernaDialog>
  );
}
