import { useState } from "react";
import { BookOpen, Compass, Loader2, Plus, Sparkles, TriangleAlert } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  NARRATIVE_ITEM_IMPORTANCE_LABELS,
  NarrativeItemImportance,
  NarrativeItemService,
  type NarrativeItem,
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
  [NarrativeItemImportance.Low]: "bg-secondary text-secondary-foreground",
  [NarrativeItemImportance.Medium]: "bg-primary/15 text-primary",
  [NarrativeItemImportance.High]: "bg-accent/15 text-accent",
  [NarrativeItemImportance.Critical]: "bg-destructive/15 text-destructive",
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <NarrativeItemCard
              key={item.id}
              item={item}
              sessionLabel={sessionLabel(item.sessionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NarrativeItemCard({
  item,
  sessionLabel,
}: {
  item: NarrativeItem;
  sessionLabel: string | null;
}) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{item.name}</CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              IMPORTANCE_BADGE_CLASS[item.importance],
            )}
          >
            {NARRATIVE_ITEM_IMPORTANCE_LABELS[item.importance]}
          </span>
        </div>
        {item.origin && (
          <CardDescription className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 shrink-0" />
            {item.origin}
          </CardDescription>
        )}
        {item.description && (
          <CardDescription className="line-clamp-3 whitespace-pre-line">
            {item.description}
          </CardDescription>
        )}
      </CardHeader>
      {sessionLabel && (
        <CardFooter className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <BookOpen className="size-3.5" />
          {sessionLabel}
        </CardFooter>
      )}
    </Card>
  );
}
