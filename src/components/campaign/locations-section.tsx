import { useState } from "react";
import { Compass, Loader2, Lock, MapPin, Plus, TriangleAlert } from "lucide-react";
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
  IMPORTANCE_LEVEL_LABELS,
  ImportanceLevel,
  LOCATION_TYPE_LABELS,
  LocationService,
  LocationType,
  type ImportanceLevelValue,
  type Location,
  type LocationTypeValue,
} from "@/services/location-service";
import { cn } from "@/utils/cn";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const createLocationSchema = z.object({
  name: z.string().min(2, "Dê um nome ao local").max(100),
  type: z.number().int(),
  region: z.string().max(100).optional().or(z.literal("")),
  importance: z.number().int(),
  description: z.string().max(500).optional().or(z.literal("")),
  isPrivate: z.boolean(),
});

type CreateLocationValues = z.infer<typeof createLocationSchema>;

const IMPORTANCE_BADGE_CLASS: Record<ImportanceLevelValue, string> = {
  [ImportanceLevel.Low]: "bg-secondary text-secondary-foreground",
  [ImportanceLevel.Medium]: "bg-primary/15 text-primary",
  [ImportanceLevel.High]: "bg-accent/15 text-accent",
  [ImportanceLevel.Critical]: "bg-destructive/15 text-destructive",
};

export function LocationsSection({
  campaignId,
  isOwnerOrMaster,
}: {
  campaignId: string;
  isOwnerOrMaster: boolean;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const locationsQuery = useQuery({
    queryKey: ["campaigns", campaignId, "locations"],
    queryFn: () => LocationService.getAllByCampaign(campaignId),
  });

  const locations = locationsQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLocationValues>({ resolver: zodResolver(createLocationSchema) });

  const createMutation = useMutation({
    mutationFn: (values: CreateLocationValues) =>
      LocationService.create(campaignId, {
        name: values.name,
        type: values.type as LocationTypeValue,
        region: values.region || null,
        importance: values.importance as ImportanceLevelValue,
        description: values.description || null,
        isPrivate: values.isPrivate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "locations"] });
      setIsCreating(false);
    },
  });

  const onSubmit: SubmitHandler<CreateLocationValues> = (values) => {
    createMutation.mutate(values);
  };

  const openCreateForm = () => {
    reset({
      name: "",
      type: LocationType.City,
      region: "",
      importance: ImportanceLevel.Medium,
      description: "",
      isPrivate: false,
    });
    setIsCreating(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {isOwnerOrMaster && (
        <div className="flex justify-end">
          <Button className="shadow-glow" onClick={openCreateForm}>
            <Plus className="size-4" />
            Novo local
          </Button>
        </div>
      )}

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Criar local</CardTitle>
            <CardDescription>Um lugar relevante dessa campanha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar o local.")}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" placeholder="Ex.: Cidadela de Aethermoor" {...register("name")} />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select id="type" {...register("type", { valueAsNumber: true })}>
                    {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importance">Importância</Label>
                  <Select id="importance" {...register("importance", { valueAsNumber: true })}>
                    {Object.entries(IMPORTANCE_LEVEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Região (opcional)</Label>
                  <Input id="region" placeholder="Ex.: Norte" {...register("region")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="O que torna esse lugar importante?"
                  {...register("description")}
                />
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

      {locationsQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando locais...
        </div>
      ) : locationsQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(locationsQuery.error, "Não foi possível carregar os locais.")}
        </div>
      ) : locations.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhum local ainda</CardTitle>
            <CardDescription>
              {isOwnerOrMaster
                ? "Crie o primeiro local dessa campanha."
                : "O mestre ainda não criou nenhum local visível."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      )}
    </div>
  );
}

function LocationCard({ location }: { location: Location }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 flex items-center gap-1.5">
            {location.isPrivate && (
              <Lock className="text-muted-foreground size-3.5 shrink-0" />
            )}
            {location.name}
          </CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              IMPORTANCE_BADGE_CLASS[location.importance],
            )}
          >
            {IMPORTANCE_LEVEL_LABELS[location.importance]}
          </span>
        </div>
        <CardDescription className="line-clamp-2">
          {location.description || "Sem descrição."}
        </CardDescription>
      </CardHeader>
      <CardFooter className="text-muted-foreground flex items-center gap-4 text-xs">
        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
          {LOCATION_TYPE_LABELS[location.type]}
        </span>
        {location.region && (
          <span className="flex items-center">
            <MapPin className="mr-1 size-3.5" />
            {location.region}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
