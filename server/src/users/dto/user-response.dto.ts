import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, User } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
//  USER RESPONSE DTO
//
//  The ONLY shape a user is ever sent to the client in.
//  Built field by field from the DB row — so passwordHash and
//  providerId can never leak, even if new columns are added.
// ─────────────────────────────────────────────────────────────

export class UserResponseDto {
  @ApiProperty({ example: '8f3c2a1e-5b7d-4c9a-9e2f-1a2b3c4d5e6f' })
  id!: string;

  @ApiProperty({ example: 'sasank@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Sasank', nullable: true, type: String })
  name!: string | null;

  @ApiPropertyOptional({ example: 'https://avatars.githubusercontent.com/u/1', nullable: true, type: String })
  avatarUrl!: string | null;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.email })
  provider!: AuthProvider;

  @ApiProperty({ example: '2026-10-09T10:00:00.000Z' })
  createdAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.avatarUrl = user.avatarUrl;
    dto.provider = user.provider;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
