import { useState } from "react";
import {
  Compass,
  Flag,
  Loader2,
  MapPinned,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
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
import {
  OPERATION_STATUS_LABELS,
  OperationService,
  OperationStatus,
  type Operation,
  type OperationStatusValue,
} from "@/services/operation-service";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";
import { cn } from "@/utils/cn";

const createOperationSchema = z.object({
  name: z.string().min(2, "Dê um nome à operação").max(200),
  objective: z.string().max(1000).optional().or(z.literal("")),
  plan: z.string().max(3000).optional().or(z.literal("")),
  requiredResources: z.string().max(2000).optional().or(z.literal("")),
  risks: z.string().max(2000).optional().or(z.literal("")),
  status: z.number().int(),
  result: z.string().max(2000).optional().or(z.literal("")),
});

type CreateOperationValues = z.infer<typeof createOperationSchema>;

const STATUS_BADGE_CLASS: Record<OperationStatusValue, string> = {
  [OperationStatus.Planned]: "border-border/60 text-muted-foreground",
  [OperationStatus.InProgress]: "border-primary/40 text-primary",
  [OperationStatus.Completed]: "border-accent/40 text-accent",
  [OperationStatus.Failed]: "border-destructive/40 text-destructive",
  [OperationStatus.Canceled]: "border-destructive/40 text-destructive",
  [OperationStatus.Archived]: "border-border/60 text-muted-foreground",
};

const ACTIVE_STATUSES: OperationStatusValue[] = [OperationStatus.Planned, OperationStatus.InProgress];

export function OperationsSection({ characterId }: { characterId: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const operationsQuery = useQuery({
    queryKey: ["characters", characterId, "operations"],
    queryFn: () => OperationService.getAllByCharacter(characterId),
  });

  const operations = operationsQuery.data ?? [];
  const activeOperations = operations.filter((op) => ACTIVE_STATUSES.includes(op.status));
  const archivedOperations = operations.filter((op) => !ACTIVE_STATUSES.includes(op.status));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateOperationValues>({ resolver: zodResolver(createOperationSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateOperationValues) =>
      OperationService.create(characterId, {
        name: values.name,
        objective: values.objective || null,
        plan: values.plan || null,
        requiredResources: values.requiredResources || null,
        risks: values.risks || null,
        status: values.status as OperationStatusValue,
        result: values.result || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId, "operations"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateOperationValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      name: "",
      objective: "",
      plan: "",
      requiredResources: "",
      risks: "",
      status: OperationStatus.Planned,
      result: "",
    });
    setIsCreating(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button className="shadow-glow" onClick={openCreateForm}>
          <Plus className="size-4" />
          Nova operação
        </Button>
      </div>

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Planejar operação</CardTitle>
            <CardDescription>Ações e planos do seu personagem.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar a operação.")}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Ex.: Infiltração no armazém" {...register("name")} />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" className="sm:w-48" {...register("status", { valueAsNumber: true })}>
                    {Object.entries(OPERATION_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo (opcional)</Label>
                <Textarea
                  id="objective"
                  placeholder="O que essa operação busca alcançar?"
                  {...register("objective")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plano (opcional)</Label>
                <Textarea
                  id="plan"
                  placeholder="Como a operação será executada?"
                  {...register("plan")}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="requiredResources">Recursos necessários (opcional)</Label>
                  <Textarea
                    id="requiredResources"
                    placeholder="O que é preciso para executar?"
                    {...register("requiredResources")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risks">Riscos (opcional)</Label>
                  <Textarea
                    id="risks"
                    placeholder="O que pode dar errado?"
                    {...register("risks")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="result">Resultado (opcional)</Label>
                <Textarea
                  id="result"
                  placeholder="Como a operação terminou?"
                  {...register("result")}
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

      {operationsQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando operações...
        </div>
      ) : operationsQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(operationsQuery.error, "Não foi possível carregar as operações.")}
        </div>
      ) : operations.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhuma operação ainda</CardTitle>
            <CardDescription>Planeje a primeira ação do seu personagem.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {activeOperations.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="dossier-eyebrow">Ativas</div>
              {activeOperations.map((operation, index) => (
                <OperationEntry key={operation.id} operation={operation} defaultOpen={index === 0} />
              ))}
            </div>
          )}

          {archivedOperations.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="dossier-eyebrow">Arquivadas</div>
              {archivedOperations.map((operation) => (
                <OperationEntry key={operation.id} operation={operation} defaultOpen={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OpRow({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof Flag;
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="dossier-icon-accent mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="dossier-meta text-[10px] tracking-widest uppercase">{label}</div>
        <p className="mt-0.5 text-sm whitespace-pre-line">{text}</p>
      </div>
    </div>
  );
}

function OperationEntry({
  operation,
  defaultOpen,
}: {
  operation: Operation;
  defaultOpen: boolean;
}) {
  return (
    <DossierEntry
      title={operation.name}
      defaultOpen={defaultOpen}
      badge={
        <span
          className={cn(
            "rounded-none border px-2 py-0.5 text-[11px] tracking-wide",
            STATUS_BADGE_CLASS[operation.status],
          )}
        >
          {OPERATION_STATUS_LABELS[operation.status]}
        </span>
      }
    >
      {operation.objective && <OpRow icon={Flag} label="Objetivo" text={operation.objective} />}
      {operation.plan && <OpRow icon={MapPinned} label="Plano" text={operation.plan} />}
      {operation.requiredResources && (
        <OpRow icon={Sparkles} label="Recursos necessários" text={operation.requiredResources} />
      )}
      {operation.risks && <OpRow icon={ShieldAlert} label="Riscos" text={operation.risks} />}
      {operation.result && <OpRow icon={Target} label="Resultado" text={operation.result} />}
    </DossierEntry>
  );
}
