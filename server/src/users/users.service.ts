// ─────────────────────────────────────────────────────────────
//  USERS SERVICE
//
//  All reads and writes of the users table. AuthService builds
//  on top of this; nothing else should query users directly.
//
//  - Emails are normalized (trimmed + lowercased) on every read
//    and write, so 'Sasank@X.com' and 'sasank@x.com' are one account.
//  - Returns full User rows (including passwordHash) because
//    AuthService needs the hash to check passwords. Convert with
//    UserResponseDto.fromEntity() before sending to the client.
// ─────────────────────────────────────────────────────────────

import { ConflictException, Injectable } from '@nestjs/common';
import { AuthProvider, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateEmailUserInput {
  email: string;
  passwordHash: string;
  name?: string | null;
}

export interface OAuthProfile {
  provider: Exclude<AuthProvider, 'email'>;
  providerId: string;   // Google 'sub' / GitHub user id
  email: string;        // must be a verified email from the provider
  name?: string | null;
  avatarUrl?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  }

  // ─────────────────────────────────────────────────────────
  //  EMAIL + PASSWORD SIGN-UP
  //  The caller hashes the password (bcrypt) before calling this.
  // ─────────────────────────────────────────────────────────
  async createEmailUser(input: CreateEmailUserInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: normalizeEmail(input.email),
          passwordHash: input.passwordHash,
          name: input.name?.trim() || null,
          provider: AuthProvider.email,
        },
      });
    } catch (err) {
      // Unique constraint on email — also catches two sign-ups racing
      if (isUniqueViolation(err)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────
  //  GOOGLE / GITHUB SIGN-IN
  //
  //  1. Same provider + providerId seen before → refresh name/avatar
  //  2. Email not used yet                      → create the user
  //  3. Email belongs to a different sign-in method → 409
  //
  //  Case 3 is deliberately refused rather than merged: silently
  //  attaching a Google login to an existing password account is a
  //  known account-takeover route. Explicit linking can come later.
  // ─────────────────────────────────────────────────────────
  async upsertOAuthUser(profile: OAuthProfile): Promise<User> {
    const email = normalizeEmail(profile.email);

    const existing = await this.prisma.user.findUnique({
      where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } },
    });
    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: profile.name ?? existing.name,
          avatarUrl: profile.avatarUrl ?? existing.avatarUrl,
        },
      });
    }

    const sameEmail = await this.prisma.user.findUnique({ where: { email } });
    if (sameEmail) {
      throw new ConflictException(conflictMessage(sameEmail.provider));
    }

    try {
      return await this.prisma.user.create({
        data: {
          email,
          name: profile.name?.trim() || null,
          avatarUrl: profile.avatarUrl ?? null,
          provider: profile.provider,
          providerId: profile.providerId,
        },
      });
    } catch (err) {
      // Lost a race with a parallel sign-in for the same email
      if (isUniqueViolation(err)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw err;
    }
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

function conflictMessage(existingProvider: AuthProvider): string {
  return existingProvider === AuthProvider.email
    ? 'This email is registered with a password — sign in with email instead'
    : `This email is already linked to ${existingProvider === AuthProvider.google ? 'Google' : 'GitHub'} — sign in with that instead`;
}
