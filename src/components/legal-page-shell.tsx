import type { ReactNode } from "react";
import { Dices } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";

export function LegalPageShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="hub-backdrop flex min-h-screen w-full flex-col">
      <header className="border-border/60 bg-background/60 sticky top-0 z-10 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to={paths.landing} className="flex items-center gap-2.5">
            <div
              aria-hidden
              className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl"
            >
              <Dices className="size-5" />
            </div>
            <span className="font-display text-lg font-semibold">Aventurário</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to={paths.landing}>Voltar ao início</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-balance">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">Última atualização: {updatedAt}</p>
        <div className="mt-10 flex flex-col gap-8">{children}</div>
      </main>

      <footer className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs sm:px-6">
          <span>© {new Date().getFullYear()} Aventurário</span>
          <nav className="flex items-center gap-4">
            <Link to={paths.terms} className="hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <Link to={paths.privacy} className="hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="text-muted-foreground flex flex-col gap-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}
