// ─────────────────────────────────────────────────────────────
//  CACHE CONSTANTS
//
//  All Redis TTL values and key prefixes in one place.
//  Never hardcode these in services — always import from here.
// ─────────────────────────────────────────────────────────────

export const CACHE_TTL = {
    // How long to cache a conversation's message history
    // 30 minutes — active chats stay warm in Redis
    CONVERSATION:    60 * 30,
 
    // How long to cache a user's connected models list
    // 1 hour — models don't change often
    USER_MODELS:     60 * 60,
 
    // How long a blacklisted JWT stays in Redis
    // Must match JWT expiry (7 days) so token stays blocked
    // until it would have expired naturally
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
//  e.g. chat:uuid-here, models:user-uuid, blacklist:token
//
//  Keeping prefixes here prevents typos across services
// ─────────────────────────────────────────────────────────────
export const CACHE_KEYS = {
  // chat:{conversationId} → cached message array
  conversation: (id: string)      => `chat:${id}`,
 
  // models:{userId} → cached models array (no keys)
  userModels:   (userId: string)  => `models:${userId}`,
 
  // blacklist:{token} → '1' if token is invalidated
  blacklist:    (token: string)   => `blacklist:${token}`,
 
  // oauth:{state} → '1' to verify CSRF state param
  oauthState:   (state: string)   => `oauth:${state}`,
 
  // rate:login:{ip} → login attempt count
  rateLogin:    (ip: string)      => `rate:login:${ip}`,
 
  // rate:register:{ip} → register attempt count
  rateRegister: (ip: string)      => `rate:register:${ip}`,
 
  // rate:ai:{userId} → AI request count per minute
  rateAi:       (userId: string)  => `rate:ai:${userId}`,
} as const;
