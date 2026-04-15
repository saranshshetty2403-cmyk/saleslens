export const ENV = {
  // External LLM provider keys for fallback chain
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "saleslens-default-secret",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // LLM / AI: prefer OPENAI_API_KEY + OPENAI_API_URL; fall back to Manus Forge if set
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiApiUrl: process.env.OPENAI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai",
  // Legacy Manus Forge (kept as fallback — will be ignored once OPENAI_API_KEY is set)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Resolved helpers used by llm.ts and voiceTranscription.ts
  get llmApiKey(): string {
    return this.openAiApiKey || this.forgeApiKey;
  },
  get llmApiUrl(): string {
    if (this.openAiApiKey) return this.openAiApiUrl;
    return this.forgeApiUrl || "https://api.openai.com";
  },
};
