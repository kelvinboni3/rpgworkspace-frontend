import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpenText,
  Check,
  Dices,
  Download,
  Mail,
  Maximize2,
  Mic,
  Quote,
  ScrollText,
  Share2,
  Sparkles,
  Swords,
  X,
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

const RPG_SYSTEMS = [
  "D&D 5e",
  "Tormenta20",
  "Ordem Paranormal",
  "Call of Cthulhu",
  "Sistema autoral da sua mesa",
];

// Prints reais do app em Front/public/screenshots/.
const SCREENSHOTS: Array<{ src: string; alt: string; caption: string }> = [
  {
    src: "/screenshots/ficha.png",
    alt: "Ficha de personagem no Aventurário com recap da história gerado por IA e histórico de atualizações recentes",
    caption: "A ficha do personagem, com recap da história gerado por IA",
  },
  {
    src: "/screenshots/diario.png",
    alt: "Diário de personagem no Aventurário organizado em abas — pessoas, teorias, operações — com blocos detalhados",
    caption: "O diário em abas e blocos: pessoas, teorias, operações e o que sua mesa precisar",
  },
];

const TESTIMONIALS: string[] = [
  "O Notion e o Trello eram difíceis de usar. Isso ficou muito fácil.",
  "O resultado é muito bonito.",
];

const PLAN_INCLUDES = [
  "Personagens ilimitados",
  "IA completa: estruturar anotações, recap e retrospectiva",
  "Diário completo com abas e blocos",
  "Funciona offline no celular e no PC (PWA)",
  "Link público para compartilhar a ficha",
  "Exportação do diário inteiro em Markdown",
];

const FAQ: Array<{ question: string; answer: string }> = [
  {
    question: "Funciona com D&D 5e, Tormenta20 e outros sistemas?",
    answer:
      "Sim. O diário é livre de regras: você organiza história, aliados e segredos do seu jeito, então funciona com D&D 5e, Tormenta20, Ordem Paranormal, Call of Cthulhu ou o sistema autoral da sua mesa.",
  },
  {
    question: "Quanto custa?",
    answer:
      "R$ 14,90/mês, com 7 dias de teste grátis sem precisar de cartão de crédito. A assinatura inclui personagens ilimitados, todos os recursos de IA e o diário completo. Cancele quando quiser.",
  },
  {
    question: "Preciso saber usar IA?",
    answer:
      "Não. Os recursos de IA funcionam com um clique: transformam suas anotações soltas em registros estruturados e geram o recap da última sessão. Você não escreve prompt nenhum.",
  },
  {
    question: "Funciona no celular e sem internet?",
    answer:
      "Sim. O Aventurário é um PWA: instale como app no celular ou no PC e use o diário na mesa mesmo sem internet.",
  },
  {
    question: "O que acontece com meus dados se eu cancelar?",
    answer:
      "Seus dados são seus. Você pode exportar o diário inteiro em Markdown a qualquer momento, sem amarras.",
  },
  {
    question: "Sou mestre — o Aventurário serve para mim?",
    answer:
      "A versão atual é focada no diário do jogador — feita por um mestre para os jogadores da mesa. Uma área dedicada ao mestre está em desenvolvimento.",
  },
];

function ProductShowcase() {
  const [expanded, setExpanded] = useState<(typeof SCREENSHOTS)[number] | null>(null);

  // Fecha o lightbox com Esc e trava o scroll da página enquanto ele está aberto.
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  return (
    <section className="flex flex-col items-center gap-8 pb-20">
      <h2 className="font-display max-w-2xl text-center text-2xl font-bold text-balance sm:text-3xl">
        Veja o Aventurário por dentro
      </h2>
      <div className="grid w-full gap-6 sm:grid-cols-2">
        {SCREENSHOTS.map((shot) => (
          <figure key={shot.src} className="glass-panel flex flex-col gap-3 overflow-hidden p-3">
            <button
              type="button"
              onClick={() => setExpanded(shot)}
              aria-label={`Ampliar imagem: ${shot.caption}`}
              className="group relative cursor-zoom-in"
            >
              <img
                src={shot.src}
                alt={shot.alt}
                loading="lazy"
                className="border-border/60 w-full rounded-lg border object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100"
              >
                <Maximize2 className="size-7 text-white" />
              </span>
            </button>
            <figcaption className="text-muted-foreground pb-1 text-center text-xs">
              {shot.caption} · clique para ampliar
            </figcaption>
          </figure>
        ))}
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={expanded.caption}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setExpanded(null)}
        >
          <button
            type="button"
            aria-label="Fechar imagem ampliada"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={() => setExpanded(null)}
          >
            <X className="size-5" />
          </button>
          <img
            src={expanded.src}
            alt={expanded.alt}
            className="max-h-[85vh] w-auto max-w-full rounded-lg shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
          <p className="text-sm text-white/80">{expanded.caption}</p>
        </div>
      )}
    </section>
  );
}

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
            <div
              aria-hidden
              className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl"
            >
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
            <Swords aria-hidden className="size-3.5" />
            Feito por um mestre, para seus jogadores
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
            R$ 14,90/mês após o teste · Sem cartão de crédito para testar · Cancele quando quiser
          </p>
        </section>

        {/* Screenshots reais do produto */}
        <ProductShowcase />

        {/* Features */}
        <section className="flex flex-col gap-8 pb-14">
          <h2 className="font-display text-center text-2xl font-bold text-balance sm:text-3xl">
            Tudo que a jornada do seu personagem merece
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="glass-panel flex flex-col gap-3 p-6">
                <div
                  aria-hidden
                  className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl"
                >
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Sistemas suportados */}
        <section className="flex flex-col items-center gap-4 pb-20 text-center">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Funciona com qualquer sistema
          </h2>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {RPG_SYSTEMS.map((system) => (
              <li
                key={system}
                className="border-border/60 bg-background/40 text-foreground/80 rounded-full border px-3.5 py-1.5 text-sm"
              >
                {system}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground max-w-md text-sm">
            O diário é livre de regras: quem manda na estrutura é você, não o sistema.
          </p>
        </section>

        {/* Prova social */}
        <section className="flex flex-col items-center gap-8 pb-20">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-display text-2xl font-bold text-balance sm:text-3xl">
              Quem testou, aprovou
            </h2>
            <p className="text-muted-foreground max-w-md text-sm sm:text-base">
              O que os primeiros jogadores disseram depois de usar o Aventurário em suas
              campanhas.
            </p>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-2">
            {TESTIMONIALS.map((quote) => (
              <figure key={quote} className="glass-panel flex flex-col gap-4 p-6">
                <Quote aria-hidden className="text-primary size-5" />
                <blockquote className="font-display text-lg font-medium text-balance">
                  “{quote}”
                </blockquote>
              </figure>
            ))}
          </div>
        </section>

        {/* Preço */}
        <section className="flex flex-col items-center gap-8 pb-20">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-display text-2xl font-bold text-balance sm:text-3xl">
              Preço simples, sem pegadinha
            </h2>
            <p className="text-muted-foreground max-w-md text-sm sm:text-base">
              Um plano único com tudo dentro. Teste antes, decida depois.
            </p>
          </div>
          <div className="glass-panel glow-ring flex w-full max-w-md flex-col items-center gap-6 p-8 text-center sm:p-10">
            <div className="flex flex-col items-center gap-1">
              <p className="font-display text-4xl font-bold">
                R$ 14,90<span className="text-muted-foreground text-lg font-medium">/mês</span>
              </p>
              <p className="text-primary text-sm font-medium">
                7 dias grátis para testar · sem cartão de crédito
              </p>
            </div>
            <ul className="flex w-full flex-col gap-2.5 text-left">
              {PLAN_INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="shadow-glow w-full">
              <Link to={paths.register}>Começar meus 7 dias grátis</Link>
            </Button>
            <p className="text-muted-foreground text-xs">
              Cancele quando quiser, direto no app.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="flex flex-col items-center gap-8 pb-20">
          <h2 className="font-display text-center text-2xl font-bold text-balance sm:text-3xl">
            Perguntas frequentes
          </h2>
          <div className="flex w-full max-w-2xl flex-col gap-3">
            {FAQ.map((item) => (
              <details key={item.question} className="glass-panel group px-6 py-4">
                <summary className="font-display cursor-pointer list-none text-base font-semibold select-none [&::-webkit-details-marker]:hidden">
                  {item.question}
                </summary>
                <p className="text-muted-foreground pt-3 text-sm leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
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
          <p className="text-muted-foreground text-xs">
            7 dias grátis · sem cartão de crédito · cancele quando quiser
          </p>
        </section>
      </main>

      <footer className="border-border/60 border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="flex items-center gap-2">
              <Dices aria-hidden className="size-4" />
              <span className="font-display font-semibold">Aventurário</span>
            </div>
            <nav aria-label="Links do rodapé" className="flex flex-col gap-2 text-sm">
              <a
                href="mailto:kelvin.bonifacio2014@gmail.com"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
              >
                <Mail aria-hidden className="size-4" />
                Contato e suporte
              </a>
            </nav>
          </div>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Aventurário · Feito por um mestre, para seus jogadores
          </p>
        </div>
      </footer>
    </div>
  );
}
