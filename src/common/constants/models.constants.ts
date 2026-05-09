// ─────────────────────────────────────────────────────────────
//  MODELS CONSTANTS
//
//  Single source of truth for everything AI-provider related.
//  Used across adapters, validation DTOs, and services.
//  Add new providers here — everything else picks them up.
// ─────────────────────────────────────────────────────────────


 
export const SUPPORTED_PROVIDERS = [
    'openai',
    'anthropic',
    'gemini',
    'deepseek',
] as const;

export type Provider = typeof SUPPORTED_PROVIDERS[number];

export const MODEL_NAMES: Record<Provider, string[]> = {
  openai:    ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  gemini:    ['gemini-2.0-flash', 'gemini-1.5-pro'],
  deepseek:  ['deepseek-chat', 'deepseek-coder'],
};

export const ALL_MODEL_NAMES = Object.values(MODEL_NAMES).flat();

export const DEFAULT_MODELS: Record<Provider, string> = {
    openai:    'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    gemini:    'gemini-2.0-flash',
    deepseek:  'deepseek-chat',
}

export const CONTEXT_LIMITS: Record<string, number> = {
  'gpt-4o':                      128_000,
  'gpt-4-turbo':                 128_000,
  'gpt-3.5-turbo':                16_385,
  'claude-3-5-sonnet-20241022':  200_000,
  'claude-3-haiku-20240307':     200_000,
  'gemini-2.0-flash':          1_000_000,
  'gemini-1.5-pro':            1_000_000,
  'deepseek-chat':               128_000,
  'deepseek-coder':              128_000,
};

export const API_KEY_PREFIXES: Record<Provider, string> = {
  openai:    'sk-',
  anthropic: 'sk-ant-',
  gemini:    'AIza',
  deepseek:  'sk-',
};

export const PRICE_PER_1K_TOKENS: Record<string, number> = {
  'gpt-4o':                     0.005,
  'gpt-4-turbo':                0.010,
  'gpt-3.5-turbo':              0.001,
  'claude-3-5-sonnet-20241022': 0.003,
  'claude-3-haiku-20240307':    0.001,
  'gemini-2.0-flash':           0.000,   // free tier
  'gemini-1.5-pro':             0.003,
  'deepseek-chat':              0.001,
  'deepseek-coder':             0.001,
};
 
export const PROVIDER_META: Record<Provider, {
  displayName: string;
  maker:       string;
  icon:        string;
}> = {
  openai:    { displayName: 'ChatGPT',       maker: 'OpenAI',         icon: '🤖' },
  anthropic: { displayName: 'Claude',        maker: 'Anthropic',      icon: '✦'  },
  gemini:    { displayName: 'Gemini',        maker: 'Google',         icon: '♊'  },
  deepseek:  { displayName: 'DeepSeek',      maker: 'DeepSeek AI',    icon: '🔷' },
};