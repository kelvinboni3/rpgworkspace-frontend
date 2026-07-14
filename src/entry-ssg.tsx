import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { LandingPage } from "@/pages/landing-page";

// Entrada do pré-render de build (ver scripts/inject-ssg.mjs): gera o HTML estático da
// landing para ser injetado no dist/index.html, de modo que buscadores e crawlers de IA
// que não executam JavaScript recebam o conteúdo real da página em vez de um root vazio.
export function render(): string {
  return renderToString(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}
