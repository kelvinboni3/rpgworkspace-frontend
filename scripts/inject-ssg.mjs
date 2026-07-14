// Pós-build: injeta o HTML pré-renderizado da landing (dist-ssr/entry-ssg.js, gerado por
// `vite build --ssr`) dentro do <div id="root"> do dist/index.html. Assim, crawlers sem
// JavaScript (Googlebot em primeira passada, GPTBot, ClaudeBot, PerplexityBot, prévias de
// link) enxergam a landing completa. Um script inline no index.html limpa esse conteúdo
// em rotas que não sejam "/" antes do React montar.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const distIndex = path.resolve(root, "../dist/index.html");
const ssgEntry = path.resolve(root, "../dist-ssr/entry-ssg.js");

const { render } = await import(ssgEntry.startsWith("/") ? ssgEntry : `file://${ssgEntry}`);
const landingHtml = render();

const indexHtml = await readFile(distIndex, "utf8");
const marker = '<div id="root">';
if (!indexHtml.includes(marker)) {
  throw new Error('inject-ssg: <div id="root"> não encontrado no dist/index.html');
}
if (!landingHtml || landingHtml.length < 1000) {
  throw new Error(`inject-ssg: HTML pré-renderizado suspeito de estar vazio (${landingHtml.length} chars)`);
}

await writeFile(distIndex, indexHtml.replace(marker, `${marker}${landingHtml}`), "utf8");
console.log(`inject-ssg: landing pré-renderizada injetada (${(landingHtml.length / 1024).toFixed(1)} kB)`);
