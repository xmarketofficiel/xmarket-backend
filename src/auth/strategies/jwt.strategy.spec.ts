/// <reference types="jest" />
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserStatus } from '../../users/entities/user.entity';

describe('Community sessions', () => {
  const member = { id: 1, email: 'member@um6p.ma', userRole: 'student', isVerified: true, status: UserStatus.ACTIVE };
  let users: { findOne: jest.Mock };
  let strategy: JwtStrategy;

  beforeEach(() => {
    users = { findOne: jest.fn().mockResolvedValue(member) };
    strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'test-secret' }), users as any, {} as any);
  });

  it.each([
    { ...member, userRole: 'student' },
    { ...member, userRole: 'staff' },
    { ...member, email: 'member@student.1337.ma' },
  ])('gives community members the same marketplace access (%#)', async account => {
    users.findOne.mockResolvedValue(account);
    await expect(strategy.validate({ sub: 1 })).resolves.toEqual(account);
  });

  it.each([
    { ...member, email: 'external@gmail.com' },
    { ...member, isVerified: false },
    { ...member, status: UserStatus.SUSPENDED },
  ])('rejects ineligible sessions even when an old token exists (%#)', async account => {
    users.findOne.mockResolvedValue(account);
    await expect(strategy.validate({ sub: 1 })).rejects.toThrow(UnauthorizedException);
  });
});
