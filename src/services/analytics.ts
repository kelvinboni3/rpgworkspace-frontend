// Tags de marketing/medição, ativadas por env no build (Plano de Marketing, Seção 3.4:
// "pixel instalado desde o dia 1" para acumular audiência de retargeting antes de
// qualquer campanha). Sem os IDs configurados, nada é carregado — zero rastreamento.
//
// Para ativar, defina no ambiente do build (deploy.sh no VPS):
//   VITE_GOOGLE_TAG_ID  → tag do Google (GA4 "G-XXXX" ou Google Ads "AW-XXXX")
//   VITE_META_PIXEL_ID  → pixel do Meta (Instagram/Facebook Ads)

type FacebookPixel = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: FacebookPixel;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: FacebookPixel;
    _fbq?: FacebookPixel;
  }
}

export function initAnalytics() {
  initGoogleTag();
  initMetaPixel();
}

function initGoogleTag() {
  const tagId = import.meta.env.VITE_GOOGLE_TAG_ID as string | undefined;
  if (!tagId) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${tagId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  // O gtag.js espera o objeto `arguments` no dataLayer, não um array comum.
  const gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  } as (...args: unknown[]) => void;
  gtag("js", new Date());
  gtag("config", tagId);
}

function initMetaPixel() {
  const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (!pixelId || window.fbq) return;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as FacebookPixel;
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}
