// ─────────────────────────────────────────────────────────────
//  RATE LIMIT CONFIG DECORATOR
//
//  Apply to any route to set custom limits:
//
//  @UseGuards(RateLimitGuard)
//  @RateLimit({ max: 5, windowSecs: 900, type: 'login' })
//  @Post('login')
//  login() { ... }
// ─────────────────────────────────────────────────────────────

