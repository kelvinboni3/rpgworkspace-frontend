import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Loader2, Settings2, Trash2, Upload, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import { pdfjsLib } from "@/utils/pdf";
import { BookVolumeService, type BookVolume } from "@/services/book-volume-service";
import { Button } from "@/components/ui/button";
import { authStore } from "@/store/auth-store";
import { extractErrorMessage } from "@/utils/api-error";
import { cn } from "@/utils/cn";

type VirtualPage = {
  volumeId: string;
  localPageNumber: number;
};

export function BookReaderDialog({
  characterTabBlockId,
  title,
  onClose,
}: {
  characterTabBlockId: string;
  title: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<Map<string, PDFDocumentLoadingTask>>(new Map());

  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<VirtualPage[] | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const volumesQuery = useQuery({
    queryKey: ["book-volumes", characterTabBlockId],
    queryFn: () => BookVolumeService.getAllByBlock(characterTabBlockId),
  });

  const volumes = useMemo(() => volumesQuery.data ?? [], [volumesQuery.data]);

  // Carrega os metadados (número de páginas) de cada volume e monta o índice virtual de páginas.
  useEffect(() => {
    let cancelled = false;

    async function buildIndex() {
      setError(null);

      for (const [id, task] of tasksRef.current) {
        if (!volumes.some((v) => v.id === id)) {
          void task.destroy();
          tasksRef.current.delete(id);
        }
      }

      const nextPages: VirtualPage[] = [];
      for (const volume of volumes) {
        try {
          let task = tasksRef.current.get(volume.id);
          if (!task) {
            task = pdfjsLib.getDocument({
              url: volume.fileUrl,
              httpHeaders: { Authorization: `Bearer ${authStore.getAccessToken()}` },
            });
            tasksRef.current.set(volume.id, task);
          }
          const doc = await task.promise;
          for (let i = 1; i <= doc.numPages; i++) {
            nextPages.push({ volumeId: volume.id, localPageNumber: i });
          }
        } catch {
          if (!cancelled) setError("Não foi possível carregar um dos PDFs do livro.");
        }
      }

      if (!cancelled) setPages(nextPages);
    }

    void buildIndex();

    return () => {
      cancelled = true;
    };
  }, [volumes]);

  useEffect(() => {
    const tasks = tasksRef.current;
    return () => {
      for (const task of tasks.values()) void task.destroy();
      tasks.clear();
    };
  }, []);

  const totalPages = pages?.length ?? 0;
  const safeCurrentPage = totalPages === 0 ? 0 : Math.min(currentPage, totalPages - 1);

  const renderCurrentPage = useCallback(async () => {
    if (!pages || pages.length === 0) return;
    const target = pages[safeCurrentPage];
    if (!target) return;

    const task = tasksRef.current.get(target.volumeId);
    const canvas = canvasRef.current;
    const container = pageContainerRef.current;
    if (!task || !canvas || !container) return;

    setIsRendering(true);
    try {
      const doc = await task.promise;
      const page = await doc.getPage(target.localPageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = container.clientWidth - 16;
      const availableHeight = container.clientHeight - 16;
      const scale = Math.min(availableWidth / baseViewport.width, availableHeight / baseViewport.height);
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext("2d");
      if (!context) return;

      await page.render({ canvas, canvasContext: context, viewport }).promise;
    } finally {
      setIsRendering(false);
    }
  }, [pages, safeCurrentPage]);

  useEffect(() => {
    void renderCurrentPage();
  }, [renderCurrentPage]);

  useEffect(() => {
    function handleResize() {
      void renderCurrentPage();
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCurrentPage]);

  const goToPage = useCallback(
    (index: number) => {
      if (!pages) return;
      setCurrentPage(Math.min(Math.max(index, 0), Math.max(pages.length - 1, 0)));
    },
    [pages],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") goToPage(safeCurrentPage + 1);
      else if (event.key === "ArrowLeft") goToPage(safeCurrentPage - 1);
      else if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeCurrentPage, goToPage, onClose]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => BookVolumeService.upload(characterTabBlockId, file),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["book-volumes", characterTabBlockId] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (volumeId: string) => BookVolumeService.remove(volumeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["book-volumes", characterTabBlockId] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Só é possível adicionar arquivos PDF.");
      return;
    }

    uploadMutation.mutate(file);
  };

  const isLoadingIndex = volumesQuery.isLoading || pages === null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="font-display truncate text-lg text-white">{title || "Livro"}</p>
          <p className="text-xs tracking-widest text-white/50 uppercase">
            {isLoadingIndex
              ? "Carregando…"
              : `Página ${totalPages === 0 ? 0 : safeCurrentPage + 1} de ${totalPages}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Adicionar páginas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => setManageOpen((o) => !o)}
          >
            <Settings2 className="size-4" />
            Volumes
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {manageOpen && (
        <div className="shrink-0 border-b border-white/10 bg-black/60 px-4 py-3">
          {volumes.length === 0 ? (
            <p className="text-sm text-white/60">Nenhum volume ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {volumes.map((volume: BookVolume, index: number) => (
                <li
                  key={volume.id}
                  className="flex items-center justify-between gap-3 text-sm text-white/80"
                >
                  <span className="truncate">
                    Volume {index + 1} · {volume.originalFileName}
                  </span>
                  <button
                    type="button"
                    title="Excluir volume"
                    className="shrink-0 text-white/50 hover:text-red-400"
                    onClick={() => {
                      if (window.confirm("Excluir este volume? As páginas dele serão perdidas."))
                        deleteMutation.mutate(volume.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div ref={pageContainerRef} className="relative flex flex-1 items-center justify-center overflow-hidden p-2">
        {isLoadingIndex ? (
          <Loader2 className="size-8 animate-spin text-white/60" />
        ) : totalPages === 0 ? (
          <p className="text-white/60">Esse livro ainda não tem páginas. Adicione um PDF pra começar.</p>
        ) : (
          <>
            <button
              type="button"
              title="Página anterior"
              aria-label="Página anterior"
              onClick={() => goToPage(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 0}
              className="absolute left-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className={cn("shadow-2xl transition-opacity", isRendering && "opacity-60")}>
              <canvas ref={canvasRef} className="bg-white" />
            </div>
            <button
              type="button"
              title="Próxima página"
              aria-label="Próxima página"
              onClick={() => goToPage(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages - 1}
              className="absolute right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
