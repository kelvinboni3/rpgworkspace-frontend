import { useState } from "react";
import { Compass, Loader2, Lock, Plus, TriangleAlert } from "lucide-react";
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
import {
  NPC_STATUS_LABELS,
  NpcService,
  NpcStatus,
  type Npc,
  type NpcStatusValue,
} from "@/services/npc-service";
import { cn } from "@/utils/cn";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createNpcSchema = z.object({
  name: z.string().min(2, "Dê um nome ao NPC").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  status: z.number().int(),
  isPrivate: z.boolean(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type CreateNpcValues = z.infer<typeof createNpcSchema>;

const STATUS_BADGE_CLASS: Record<NpcStatusValue, string> = {
  [NpcStatus.Alive]: "bg-primary/15 text-primary",
  [NpcStatus.Dead]: "bg-destructive/15 text-destructive",
  [NpcStatus.Missing]: "bg-accent/15 text-accent",
  [NpcStatus.Unknown]: "bg-secondary text-secondary-foreground",
};

export function NpcsSection({
  campaignId,
  isOwnerOrMaster,
}: {
  campaignId: string;
  isOwnerOrMaster: boolean;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const npcsQuery = useQuery({
    queryKey: ["campaigns", campaignId, "npcs"],
    queryFn: () => NpcService.getAllByCampaign(campaignId),
  });

  const npcs = npcsQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateNpcValues>({ resolver: zodResolver(createNpcSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateNpcValues) =>
      NpcService.create(campaignId, {
        name: values.name,
        description: values.description || null,
        status: values.status as NpcStatusValue,
        isPrivate: values.isPrivate,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "npcs"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateNpcValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      name: "",
      description: "",
      status: NpcStatus.Unknown,
      isPrivate: false,
      notes: "",
    });
    setIsCreating(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {isOwnerOrMaster && (
        <div className="flex justify-end">
          <Button className="shadow-glow" onClick={openCreateForm}>
            <Plus className="size-4" />
            Novo NPC
          </Button>
        </div>
      )}

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Criar NPC</CardTitle>
            <CardDescription>Um personagem não jogável dessa campanha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar o NPC.")}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Ex.: Capitão Aldric" {...register("name")} />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    className="sm:w-40"
                    {...register("status", { valueAsNumber: true })}
                  >
                    {Object.entries(NPC_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Quem é esse personagem?"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas do mestre (opcional)</Label>
                <Input id="notes" placeholder="Anotações privadas" {...register("notes")} />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  {...register("isPrivate")}
                />
                Visível apenas para Owner/Master
              </label>

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
                  Criar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {npcsQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando NPCs...
        </div>
      ) : npcsQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(npcsQuery.error, "Não foi possível carregar os NPCs.")}
        </div>
      ) : npcs.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhum NPC ainda</CardTitle>
            <CardDescription>
              {isOwnerOrMaster
                ? "Crie o primeiro NPC dessa campanha."
                : "O mestre ainda não criou nenhum NPC visível."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {npcs.map((npc) => (
            <NpcCard key={npc.id} npc={npc} />
          ))}
        </div>
      )}
    </div>
  );
}

function NpcCard({ npc }: { npc: Npc }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 flex items-center gap-1.5">
            {npc.isPrivate && <Lock className="text-muted-foreground size-3.5 shrink-0" />}
            {npc.name}
          </CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_BADGE_CLASS[npc.status],
            )}
          >
            {NPC_STATUS_LABELS[npc.status]}
          </span>
        </div>
        <CardDescription className="line-clamp-2">
          {npc.description || "Sem descrição."}
        </CardDescription>
      </CardHeader>
      {npc.isPrivate && (
        <CardFooter className="text-muted-foreground text-xs">Privado</CardFooter>
      )}
    </Card>
  );
}
