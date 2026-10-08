import { ConflictException } from '@nestjs/common';
import { AuthProvider, Prisma, User } from '@prisma/client';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { PrismaService } from '../prisma/prisma.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'sasank@example.com',
    passwordHash: '$2a$12$hash',
    name: 'Sasank',
    avatarUrl: null,
    provider: AuthProvider.email,
    providerId: null,
    createdAt: new Date('2026-10-09T10:00:00Z'),
    updatedAt: new Date('2026-10-09T10:00:00Z'),
    ...overrides,
  };
}

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('UsersService', () => {
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock } };
  let service: UsersService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('findByEmail', () => {
    it('normalizes the email before looking it up', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.findByEmail('  Sasank@Example.COM ');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'sasank@example.com' } });
    });
  });

  describe('createEmailUser', () => {
    it('stores a normalized email and the email provider', async () => {
      prisma.user.create.mockResolvedValue(makeUser());
      await service.createEmailUser({ email: 'Sasank@Example.com', passwordHash: 'h', name: '  Sasank ' });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'sasank@example.com', passwordHash: 'h', name: 'Sasank', provider: AuthProvider.email },
      });
    });

    it('turns a duplicate email into a 409', async () => {
      prisma.user.create.mockRejectedValue(uniqueViolation());
      await expect(
        service.createEmailUser({ email: 'a@b.com', passwordHash: 'h' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lets other database errors through unchanged', async () => {
      const boom = new Error('connection lost');
      prisma.user.create.mockRejectedValue(boom);
      await expect(service.createEmailUser({ email: 'a@b.com', passwordHash: 'h' })).rejects.toBe(boom);
    });
  });

  describe('upsertOAuthUser', () => {
    const profile = {
      provider: AuthProvider.google as 'google',
      providerId: 'g-123',
      email: 'Sasank@Gmail.com',
      name: 'Sasank D',
      avatarUrl: 'https://img/new.png',
    };

    it('updates name and avatar for a returning user', async () => {
      const existing = makeUser({ provider: AuthProvider.google, providerId: 'g-123', passwordHash: null });
      prisma.user.findUnique.mockResolvedValueOnce(existing);
      prisma.user.update.mockResolvedValue(existing);

      await service.upsertOAuthUser(profile);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { provider_providerId: { provider: 'google', providerId: 'g-123' } },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Sasank D', avatarUrl: 'https://img/new.png' },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a new user with no password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser());

      await service.upsertOAuthUser(profile);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'sasank@gmail.com',
          name: 'Sasank D',
          avatarUrl: 'https://img/new.png',
          provider: 'google',
          providerId: 'g-123',
        },
      });
    });

    it('refuses to attach Google to an existing password account', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)                 // no google user yet
        .mockResolvedValueOnce(makeUser());          // email already used with a password
      await expect(service.upsertOAuthUser(profile)).rejects.toThrow(/sign in with email/);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('names the other provider when the email is linked to GitHub', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeUser({ provider: AuthProvider.github, passwordHash: null }));
      await expect(service.upsertOAuthUser(profile)).rejects.toThrow(/GitHub/);
    });
  });

  describe('UserResponseDto', () => {
    it('never includes the password hash or provider id', () => {
      const dto = UserResponseDto.fromEntity(
        makeUser({ provider: AuthProvider.github, providerId: 'gh-9' }),
      );
      const json = JSON.stringify(dto);
      expect(json).not.toContain('passwordHash');
      expect(json).not.toContain('$2a$12$hash');
      expect(json).not.toContain('gh-9');
      expect(Object.keys(dto).sort()).toEqual(
        ['avatarUrl', 'createdAt', 'email', 'id', 'name', 'provider'],
      );
    });
  });
});
