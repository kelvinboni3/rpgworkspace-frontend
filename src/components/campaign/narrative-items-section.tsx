import { useState } from "react";
import { Compass, Loader2, Plus, Sparkles, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DossierEntry } from "@/components/dossier/dossier-entry";
import { DossierMarkdown } from "@/components/dossier/dossier-markdown";
import {
  NARRATIVE_ITEM_IMPORTANCE_LABELS,
  NarrativeItemImportance,
  NarrativeItemService,
  type NarrativeItemImportanceValue,
} from "@/services/narrative-item-service";
import { SessionService } from "@/services/session-service";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";
import { cn } from "@/utils/cn";

const createNarrativeItemSchema = z.object({
  name: z.string().min(2, "Dê um nome ao item").max(200),
  origin: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  sessionId: z.string().optional().or(z.literal("")),
  importance: z.number().int(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type CreateNarrativeItemValues = z.infer<typeof createNarrativeItemSchema>;

const IMPORTANCE_BADGE_CLASS: Record<NarrativeItemImportanceValue, string> = {
  [NarrativeItemImportance.Low]: "border-border/60 text-muted-foreground",
  [NarrativeItemImportance.Medium]: "border-primary/40 text-primary",
  [NarrativeItemImportance.High]: "border-accent/40 text-accent",
  [NarrativeItemImportance.Critical]: "border-destructive/40 text-destructive",
};

export function NarrativeItemsSection({
  characterId,
  campaignId,
}: {
  characterId: string;
  campaignId: string;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ["characters", characterId, "narrative-items"],
    queryFn: () => NarrativeItemService.getAllByCharacter(characterId),
  });

  const sessionsQuery = useQuery({
    queryKey: ["campaigns", campaignId, "sessions"],
    queryFn: () => SessionService.getAllByCampaign(campaignId),
  });

  const items = itemsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateNarrativeItemValues>({ resolver: zodResolver(createNarrativeItemSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateNarrativeItemValues) =>
      NarrativeItemService.create(characterId, {
        name: values.name,
        origin: values.origin || null,
        description: values.description || null,
        sessionId: values.sessionId || null,
        importance: values.importance as NarrativeItemImportanceValue,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId, "narrative-items"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateNarrativeItemValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      name: "",
      origin: "",
      description: "",
      sessionId: "",
      importance: NarrativeItemImportance.Medium,
      notes: "",
    });
    setIsCreating(true);
  };

  const sessionLabel = (sessionId: string | null) => {
    if (!sessionId) return null;
    const session = sessions.find((s) => s.id === sessionId);
    return session ? `#${session.number} — ${session.title}` : null;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button className="shadow-glow" onClick={openCreateForm}>
          <Plus className="size-4" />
          Novo item
        </Button>
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Registrar item narrativo</CardTitle>
            <CardDescription>Objetos, pistas e artefatos relevantes para sua história.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar o item.")}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Ex.: Anel de sinete rasgado" {...register("name")} />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="origin">Origem (opcional)</Label>
                  <Input id="origin" placeholder="Ex.: Encontrado no porão da taverna" {...register("origin")} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="importance">Importância</Label>
                  <Select id="importance" {...register("importance", { valueAsNumber: true })}>
                    {Object.entries(NARRATIVE_ITEM_IMPORTANCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionId">Sessão (opcional)</Label>
                  <Select id="sessionId" className="sm:w-56" {...register("sessionId")}>
                    <option value="">Nenhuma</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        #{session.number} — {session.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="O que é esse item e por que importa?"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Anotações adicionais, teorias sobre o item..."
                  {...register("notes")}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreating(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {itemsQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando itens...
        </div>
      ) : itemsQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(itemsQuery.error, "Não foi possível carregar os itens.")}
        </div>
      ) : items.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhum item ainda</CardTitle>
            <CardDescription>Registre o primeiro item narrativo do seu personagem.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <DossierEntry
              key={item.id}
              title={item.name}
              defaultOpen={index === 0}
              badge={
                <span
                  className={cn(
                    "rounded-none border px-2 py-0.5 text-[11px] tracking-wide",
                    IMPORTANCE_BADGE_CLASS[item.importance],
                  )}
                >
                  {NARRATIVE_ITEM_IMPORTANCE_LABELS[item.importance]}
                </span>
              }
              meta={sessionLabel(item.sessionId) ?? undefined}
            >
              {item.origin && (
                <p className="dossier-meta flex items-center gap-1.5 text-xs">
                  <Sparkles className="size-3.5 shrink-0" />
                  {item.origin}
                </p>
              )}
              {item.description && <DossierMarkdown text={item.description} />}
              {item.notes && (
                <div>
                  <h4 className="font-display text-primary/90 mb-1 text-xs tracking-wide uppercase">
                    Notas
                  </h4>
                  <DossierMarkdown text={item.notes} />
                </div>
              )}
            </DossierEntry>
          ))}
        </div>
      )}
    </div>
  );
}
