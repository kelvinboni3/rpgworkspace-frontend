import { useState } from "react";
import { Compass, Loader2, Plus, Target, TriangleAlert } from "lucide-react";
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
  [OperationStatus.Planned]: "bg-secondary text-secondary-foreground",
  [OperationStatus.InProgress]: "bg-primary/15 text-primary",
  [OperationStatus.Completed]: "bg-accent/15 text-accent",
  [OperationStatus.Failed]: "bg-destructive/15 text-destructive",
  [OperationStatus.Canceled]: "bg-destructive/15 text-destructive",
  [OperationStatus.Archived]: "bg-secondary text-secondary-foreground",
};

export function OperationsSection({ characterId }: { characterId: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const operationsQuery = useQuery({
    queryKey: ["characters", characterId, "operations"],
    queryFn: () => OperationService.getAllByCharacter(characterId),
  });

  const operations = operationsQuery.data ?? [];

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {operations.map((operation) => (
            <OperationCard key={operation.id} operation={operation} />
          ))}
        </div>
      )}
    </div>
  );
}

function OperationCard({ operation }: { operation: Operation }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{operation.name}</CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_BADGE_CLASS[operation.status],
            )}
          >
            {OPERATION_STATUS_LABELS[operation.status]}
          </span>
        </div>
        {operation.objective && (
          <CardDescription className="line-clamp-3 whitespace-pre-line">
            {operation.objective}
          </CardDescription>
        )}
      </CardHeader>
      {operation.result && (
        <CardFooter className="text-muted-foreground flex items-start gap-1.5 text-xs">
          <Target className="mt-0.5 size-3.5 shrink-0" />
          <span className="line-clamp-2">{operation.result}</span>
        </CardFooter>
      )}
    </Card>
  );
}
