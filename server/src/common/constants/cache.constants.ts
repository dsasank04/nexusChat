// ─────────────────────────────────────────────────────────────
//  CACHE CONSTANTS
//
//  All Redis TTL values and key prefixes in one place.
//  Never hardcode these in services — always import from here.
// ─────────────────────────────────────────────────────────────

export const CACHE_TTL = {
    // How long to cache a user's connected models list
    // 1 hour — models don't change often
    USER_MODELS:     60 * 60,
 
    // Upper bound for how long a blacklisted JWT stays in Redis.
    // Each entry actually expires when its token would have,
    // so this only caps tokens with an unexpectedly long life.
    TOKEN_BLACKLIST: 60 * 60 * 24 * 7,
 
    // How long to store OAuth state param for CSRF protection
    // 10 minutes — enough time to complete OAuth flow
    OAUTH_STATE:     60 * 10,
 
    // Rate limit windows
    RATE_LOGIN:      60 * 15,   // 15 minutes
    RATE_REGISTER:   60 * 60,   // 1 hour
    RATE_AI:         60,        // 1 minute
} as const;

// ─────────────────────────────────────────────────────────────
//  REDIS KEY PREFIXES
//
//  All Redis keys follow the pattern: prefix:identifier
//  e.g. models:user-uuid, blacklist:jti
//  RedisService adds the global 'nexusChat:' prefix to every key.
//
//  Message history is intentionally not cached (see CacheService).
//  Keeping prefixes here prevents typos across services
// ─────────────────────────────────────────────────────────────
export const CACHE_KEYS = {
  // models:{userId} → cached models array (no keys)
  userModels:   (userId: string)  => `models:${userId}`,

  // blacklist:{jti} → '1' if the token with this id is logged out
  blacklist:    (jti: string)     => `blacklist:${jti}`,
 
  // oauth:{state} → '1' to verify CSRF state param
  oauthState:   (state: string)   => `oauth:${state}`,
 
  // rate:login:{ip} → login attempt count
  rateLogin:    (ip: string)      => `rate:login:${ip}`,
 
  // rate:register:{ip} → register attempt count
  rateRegister: (ip: string)      => `rate:register:${ip}`,
 
  // rate:ai:{userId} → AI request count per minute
  rateAi:       (userId: string)  => `rate:ai:${userId}`,
} as const;
