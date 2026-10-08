// ─────────────────────────────────────────────────────────────
//  CURRENT USER DECORATOR
//
//  Extracts the authenticated user from the request object.
//  JWT guard attaches req.user after verifying the token.
//
//  Usage in controllers:
//
//  @Get('me')
//  @UseGuards(JwtGuard)
//  getMe(@CurrentUser() user: JwtPayload) {
//    return user;
//  }
//
//  You can also get a single field:
//  @CurrentUser('id') userId: string
// ─────────────────────────────────────────────────────────────

import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtPayload {
    id: string;
    email: string;
    iat: number;
    exp: number;
}

export const CurrentUser = createParamDecorator(
    (field: keyof JwtPayload | undefined, ctx:ExecutionContext) =>{
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as JwtPayload; // attached by JWT guard
        
        return field ? user?.[field] : user;
    }
)
