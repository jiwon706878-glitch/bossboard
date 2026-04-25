import { listAgents } from "./service";

export const LOCAL_AI_WARNING =
  "Running multiple local AI agents simultaneously may exceed your machine's RAM/VRAM. " +
  "Consider running them sequentially or using a smaller model.";

export async function checkLocalAIConflict(): Promise<{ warn: boolean; count: number }> {
  const agents = await listAgents();
  const localActive = agents.filter(
    (a) => a.ai_provider === "local" && a.status === "active",
  );
  return {
    warn: localActive.length >= 2,
    count: localActive.length,
  };
}
