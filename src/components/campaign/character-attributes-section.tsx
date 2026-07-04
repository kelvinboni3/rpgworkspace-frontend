import { useState } from "react";
import { Check, Compass, Loader2, Pencil, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CharacterAttributeService,
  type CharacterAttribute,
} from "@/services/character-attribute-service";
import { extractErrorMessage } from "@/utils/api-error";

type AttributeFormValues = {
  name: string;
  value: string;
};

export function CharacterAttributesSection({ characterId }: { characterId: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const attributesQuery = useQuery({
    queryKey: ["characters", characterId, "attributes"],
    queryFn: () => CharacterAttributeService.getAllByCharacter(characterId),
  });

  const attributes = attributesQuery.data ?? [];

  const createForm = useForm<AttributeFormValues>();
  const editForm = useForm<AttributeFormValues>();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["characters", characterId, "attributes"] });

  const createMutation = useMutation({
    mutationFn: (values: AttributeFormValues) =>
      CharacterAttributeService.create(characterId, values),
    onSuccess: () => {
      invalidate();
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AttributeFormValues }) =>
      CharacterAttributeService.update(id, values),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CharacterAttributeService.remove(id),
    onSuccess: () => invalidate(),
  });

  const openCreateForm = () => {
    createForm.reset({ name: "", value: "" });
    setIsCreating(true);
  };

  const openEditForm = (attribute: CharacterAttribute) => {
    editForm.reset({ name: attribute.name, value: attribute.value });
    setEditingId(attribute.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Excluir este atributo?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button className="shadow-glow" onClick={openCreateForm}>
          <Plus className="size-4" />
          Novo atributo
        </Button>
      </div>

      {isCreating && (
        <form
          onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
          noValidate
          className="dossier-frame glass-panel flex flex-wrap items-end gap-2 px-5 py-4"
        >
          {createMutation.isError && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {extractErrorMessage(createMutation.error, "Não foi possível criar o atributo.")}
              </span>
            </div>
          )}
          <div className="w-32 space-y-1">
            <label className="dossier-meta text-xs">Nome</label>
            <Input placeholder="Ex.: FOR" {...createForm.register("name", { required: true, maxLength: 50 })} />
          </div>
          <div className="w-40 space-y-1">
            <label className="dossier-meta text-xs">Valor</label>
            <Input placeholder="Ex.: 0" {...createForm.register("value", { required: true, maxLength: 100 })} />
          </div>
          <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </form>
      )}

      {attributesQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando atributos...
        </div>
      ) : attributesQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(attributesQuery.error, "Não foi possível carregar os atributos.")}
        </div>
      ) : attributes.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhum atributo ainda</CardTitle>
            <CardDescription>Registre os atributos do sistema dessa campanha.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="dossier-frame glass-panel grid grid-cols-1 gap-x-8 px-5 py-2 sm:grid-cols-2">
          {attributes.map((attribute) =>
            editingId === attribute.id ? (
              <form
                key={attribute.id}
                onSubmit={editForm.handleSubmit((values) =>
                  updateMutation.mutate({ id: attribute.id, values }),
                )}
                noValidate
                className="border-border/60 flex items-center gap-2 border-b border-dotted py-2 last:border-b-0"
              >
                <Input className="w-28" {...editForm.register("name", { required: true, maxLength: 50 })} />
                <Input className="flex-1" {...editForm.register("value", { required: true, maxLength: 100 })} />
                <Button type="submit" variant="ghost" size="icon" disabled={updateMutation.isPending}>
                  <Check className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingId(null)}
                  disabled={updateMutation.isPending}
                >
                  <X className="size-3.5" />
                </Button>
              </form>
            ) : (
              <div
                key={attribute.id}
                className="border-border/60 group flex items-center justify-between border-b border-dotted py-2 last:border-b-0"
              >
                <span className="dossier-meta text-xs">{attribute.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-display text-primary text-sm">{attribute.value}</span>
                  <button
                    type="button"
                    onClick={() => openEditForm(attribute)}
                    className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    title="Editar atributo"
                    aria-label="Editar atributo"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(attribute.id)}
                    className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                    title="Excluir atributo"
                    aria-label="Excluir atributo"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
