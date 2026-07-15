import { useState } from "react";

// Preferência de visualização de quem está olhando a página (pedido dos testers:
// poder fechar os cards "Atualizado recentemente" e "Anteriormente, nessa história...").
// Vive no localStorage por card/personagem — não é estado do servidor.
const STORAGE_KEY = "aventurario-collapsed-cards";

function readCollapsedIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function useCollapsedCard(cardId: string) {
  const [isCollapsed, setIsCollapsed] = useState(() => readCollapsedIds().includes(cardId));

  const toggleCollapsed = () => {
    const ids = new Set(readCollapsedIds());
    if (isCollapsed) ids.delete(cardId);
    else ids.add(cardId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // localStorage indisponível — o recolher ainda funciona durante a sessão.
    }
    setIsCollapsed(!isCollapsed);
  };

  return { isCollapsed, toggleCollapsed };
}
