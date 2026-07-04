import { useState } from "react";
import { Compass, Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DossierEntry } from "@/components/dossier/dossier-entry";
import {
  CharacterTabEntryService,
  type CharacterTabEntry,
} from "@/services/character-tab-entry-service";
import { CharacterTabService } from "@/services/character-tab-service";
import { extractErrorMessage } from "@/utils/api-error";
import { zodResolver } from "@/utils/form";

const entryFormSchema = z.object({
  title: z.string().min(2, "Dê um título ao bloco").max(200),
  content: z.string().min(1, "Escreva o conteúdo do bloco").max(5000),
});

type EntryFormValues = z.infer<typeof entryFormSchema>;

export function CharacterTabSection({
  tabId,
  tabName,
  characterId,
  onTabDeleted,
}: {
  tabId: string;
  tabName: string;
  characterId: string;
  onTabDeleted: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isRenamingTab, setIsRenamingTab] = useState(false);
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ["character-tabs", tabId, "entries"],
    queryFn: () => CharacterTabEntryService.getAllByTab(tabId),
  });

  const entries = entriesQuery.data ?? [];

  const createForm = useForm<EntryFormValues>({ resolver: zodResolver(entryFormSchema) });
  const editForm = useForm<EntryFormValues>({ resolver: zodResolver(entryFormSchema) });
  const renameForm = useForm<{ name: string }>();

  const invalidateEntries = () =>
    queryClient.invalidateQueries({ queryKey: ["character-tabs", tabId, "entries"] });

  const invalidateTabs = () =>
    queryClient.invalidateQueries({ queryKey: ["characters", characterId, "tabs"] });

  const createMutation = useMutation({
    mutationFn: (values: EntryFormValues) => CharacterTabEntryService.create(tabId, values),
    onSuccess: () => {
      invalidateEntries();
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EntryFormValues }) =>
      CharacterTabEntryService.update(id, values),
    onSuccess: () => {
      invalidateEntries();
      setEditingEntryId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CharacterTabEntryService.remove(id),
    onSuccess: () => invalidateEntries(),
  });

  const renameTabMutation = useMutation({
    mutationFn: (name: string) => CharacterTabService.update(tabId, { name }),
    onSuccess: () => {
      invalidateTabs();
      setIsRenamingTab(false);
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: () => CharacterTabService.remove(tabId),
    onSuccess: () => {
      invalidateTabs();
      onTabDeleted();
    },
  });

  const openCreateForm = () => {
    createForm.reset({ title: "", content: "" });
    setIsCreating(true);
  };

  const openEditForm = (entry: CharacterTabEntry) => {
    editForm.reset({ title: entry.title, content: entry.content });
    setEditingEntryId(entry.id);
  };

  const openRenameTab = () => {
    renameForm.reset({ name: tabName });
    setIsRenamingTab(true);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm("Excluir este bloco de anotação? Essa ação não pode ser desfeita.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteTab = () => {
    if (
      window.confirm(
        `Excluir a aba "${tabName}" e todos os blocos dentro dela? Essa ação não pode ser desfeita.`,
      )
    ) {
      deleteTabMutation.mutate();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={openRenameTab}>
            <Pencil className="size-3.5" />
            Renomear aba
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteTab}
            disabled={deleteTabMutation.isPending}
          >
            <Trash2 className="size-3.5" />
            Excluir aba
          </Button>
        </div>
        <Button className="shadow-glow" onClick={openCreateForm}>
          <Plus className="size-4" />
          Novo bloco
        </Button>
      </div>

      {isRenamingTab && (
        <Card className="glass-panel glow-ring">
          <CardContent className="pt-6">
            <form
              onSubmit={renameForm.handleSubmit((values) => renameTabMutation.mutate(values.name))}
              noValidate
              className="flex items-end gap-2"
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="tab-name">Nome da aba</Label>
                <Input
                  id="tab-name"
                  {...renameForm.register("name", { required: true, maxLength: 100 })}
                />
              </div>
              <Button type="button" variant="ghost" onClick={() => setIsRenamingTab(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={renameTabMutation.isPending}>
                {renameTabMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isCreating && (
        <Card className="glass-panel glow-ring">
          <CardHeader>
            <CardTitle>Novo bloco</CardTitle>
            <CardDescription>Escreva livremente — título e texto, do seu jeito.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
              noValidate
              className="space-y-4"
            >
              {createMutation.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {extractErrorMessage(createMutation.error, "Não foi possível criar o bloco.")}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" placeholder="Ex.: A Estante" {...createForm.register("title")} />
                {createForm.formState.errors.title && (
                  <p className="text-destructive text-sm">
                    {createForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo</Label>
                <Textarea
                  id="content"
                  placeholder="Escreva o que quiser aqui..."
                  {...createForm.register("content")}
                />
                {createForm.formState.errors.content && (
                  <p className="text-destructive text-sm">
                    {createForm.formState.errors.content.message}
                  </p>
                )}
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

      {entriesQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando blocos...
        </div>
      ) : entriesQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          {extractErrorMessage(entriesQuery.error, "Não foi possível carregar os blocos.")}
        </div>
      ) : entries.length === 0 ? (
        <Card className="glass-panel border-dashed">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
              <Compass className="size-6" />
            </div>
            <CardTitle>Nenhum bloco ainda</CardTitle>
            <CardDescription>Escreva o primeiro bloco de anotação dessa aba.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry, index) => (
            <DossierEntry key={entry.id} title={entry.title} defaultOpen={index === 0}>
              {editingEntryId === entry.id ? (
                <form
                  onSubmit={editForm.handleSubmit((values) =>
                    updateMutation.mutate({ id: entry.id, values }),
                  )}
                  noValidate
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`edit-title-${entry.id}`}>Título</Label>
                    <Input id={`edit-title-${entry.id}`} {...editForm.register("title")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-content-${entry.id}`}>Conteúdo</Label>
                    <Textarea id={`edit-content-${entry.id}`} {...editForm.register("content")} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingEntryId(null)}
                      disabled={updateMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                      Salvar
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="whitespace-pre-line text-sm">{entry.content}</p>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(entry)}>
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry.id)}>
                      <Trash2 className="size-3.5" />
                      Excluir
                    </Button>
                  </div>
                </>
              )}
            </DossierEntry>
          ))}
        </div>
      )}
    </div>
  );
}
