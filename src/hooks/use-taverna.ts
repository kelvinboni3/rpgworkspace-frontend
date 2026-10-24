import { useContext } from "react";
import { TavernaContext } from "@/components/taverna/taverna-context";

export function useTaverna() {
  const context = useContext(TavernaContext);
  if (!context) {
    throw new Error("useTaverna precisa estar dentro de <TavernaProvider>.");
  }
  return context;
}
