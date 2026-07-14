import type { ReactNode } from "react";
import {
  BookOpenText,
  Dices,
  Download,
  Mic,
  ScrollText,
  Share2,
  Sparkles,
  Swords,
} from "lucide-react";
import { Link, Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";
import { authStore } from "@/store/auth-store";

const FEATURES: Array<{ icon: ReactNode; title: string; description: string }> = [
  {
    icon: <ScrollText className="size-5" />,
    title: "Diário vivo do personagem",
    description:
      "Anote história, aliados, teorias e segredos em abas e blocos organizados. Tudo que seu personagem viveu, num só lugar.",
  },
  {
    icon: <Sparkles className="size-5" />,
    title: "IA a favor da sua mesa",
    description:
      "Transforme anotações soltas em registros estruturados, receba recaps da última sessão e uma retrospectiva ao encerrar a campanha.",
  },
  {
    icon: <Share2 className="size-5" />,
    title: "Compartilhe seu herói",
    description:
      "Gere um link público read-only da ficha do seu personagem e mostre para a mesa — ou para o mundo.",
  },
  {
    icon: <Download className="size-5" />,
    title: "Funciona offline",
    description:
      "Instale como app no celular ou no PC (PWA) e leve seu diário para a mesa mesmo sem internet.",
  },
  {
    icon: <Mic className="size-5" />,
    title: "Ditado por voz",
    description:
      "Registre o que aconteceu na sessão falando — perfeito para anotar no calor do jogo sem perder o ritmo.",
  },
  {
    icon: <BookOpenText className="size-5" />,
    title: "Exporte quando quiser",
    description:
      "Baixe o diário inteiro em Markdown. Seus dados são seus, sem amarras.",
  },
];

export function LandingPage() {
  // Já logado? A landing é só a porta de entrada — manda direto pro app.
  if (authStore.isAuthenticated()) {
    return <Navigate to={paths.characters} replace />;
  }

  return (
    <div className="hub-backdrop flex min-h-screen w-full flex-col">
      <header className="border-border/60 bg-background/60 sticky top-0 z-10 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Dices className="size-5" />
            </div>
            <span className="font-display text-lg font-semibold">Aventurário</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={paths.login}>Entrar</Link>
            </Button>
            <Button asChild size="sm" className="shadow-glow">
              <Link to={paths.register}>Criar conta grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
        {/* Hero */}
        <section className="animate-fade-in-up relative flex flex-col items-center gap-6 py-20 text-center sm:py-28">
          <div
            aria-hidden
            className="bg-primary/20 animate-float absolute -z-10 size-80 rounded-full blur-3xl"
          />
          <span className="border-primary/30 bg-primary/5 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <Swords className="size-3.5" />
            Feito para jogadores de RPG de mesa
          </span>
          <h1 className="font-display text-gradient max-w-3xl text-4xl leading-tight font-bold text-balance sm:text-5xl xl:text-6xl">
            O diário definitivo do seu personagem de RPG
          </h1>
          <p className="text-muted-foreground max-w-xl text-base text-pretty sm:text-lg">
            Guarde a história, os segredos e a jornada do seu personagem num só lugar —
            com IA, funcionando offline e pronto para compartilhar. Do primeiro nível ao
            final épico da campanha.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="shadow-glow">
              <Link to={paths.register}>Começar agora — 7 dias grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={paths.login}>Já tenho conta</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Sem cartão de crédito para testar · Cancele quando quiser
          </p>
        </section>

        {/* Features */}
        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="glass-panel flex flex-col gap-3 p-6">
              <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                {feature.icon}
              </div>
              <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        {/* CTA final */}
        <section className="glass-panel glow-ring animate-fade-in-up mb-20 flex flex-col items-center gap-5 p-10 text-center sm:p-14">
          <h2 className="font-display max-w-2xl text-2xl font-bold text-balance sm:text-3xl">
            Sua próxima campanha merece um diário à altura.
          </h2>
          <p className="text-muted-foreground max-w-md text-sm sm:text-base">
            Crie sua conta e comece a registrar a jornada do seu personagem hoje mesmo.
          </p>
          <Button asChild size="lg" className="shadow-glow">
            <Link to={paths.register}>Criar minha conta grátis</Link>
          </Button>
        </section>
      </main>

      <footer className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Dices className="size-4" />
            <span className="font-display font-semibold">Aventurário</span>
          </div>
          <span>© {new Date().getFullYear()} Aventurário · Feito para mestres e jogadores</span>
        </div>
      </footer>
    </div>
  );
}
