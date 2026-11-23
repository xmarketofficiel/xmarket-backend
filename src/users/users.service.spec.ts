/// <reference types="jest" />
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { UsersService } from './users.service';
import { UserStatus } from './entities/user.entity';

describe('Community profile privacy', () => {
  let members: { findOne: jest.Mock };
  let listings: { findAndCount: jest.Mock };
  let service: UsersService;
  const member = {
    id: 2, fullName: 'Test Member', userRole: 'staff', department: 'UM6P',
    email: 'member@um6p.ma', isVerified: true, status: UserStatus.ACTIVE,
    createdAt: new Date('2025-01-01'), showPhone: false, whatsappNumber: '+212612345678',
    passwordHash: 'private-hash', address: 'Private address', role: 'user',
    profileImageUrl: '/avatar.jpg', profileImageSpacesKey: 'private-storage-key',
  };

  beforeEach(() => {
    members = { findOne: jest.fn().mockResolvedValue({ ...member }) };
    listings = { findAndCount: jest.fn().mockResolvedValue([[{
      id: 10, title: 'Desk lamp', price: 80, category: 'Home', condition: 'Good',
      sellerId: 2, createdAt: new Date('2025-02-01'),
      images: [{ imageOrder: 0, spacesUrl: '/lamp.jpg', spacesKey: 'private-image-key' }],
      interests: ['private-interest'],
    }], 13]) };
    service = new UsersService(members as any, {} as any, {} as any, {} as any, listings as any, {} as any, {} as any);
  });

  it('returns the member identity and listings without account or purchasing details', async () => {
    const profile = await service.getCommunityProfile(2);
    expect(profile.user).toMatchObject({ id: 2, fullName: 'Test Member', userRole: 'staff' });
    for (const field of ['email', 'passwordHash', 'address', 'role', 'whatsappNumber', 'profileImageSpacesKey']) {
      expect(profile.user).not.toHaveProperty(field);
    }
    expect(profile).not.toHaveProperty('boughtItems');
    expect(profile.items[0]).toEqual(expect.objectContaining({ id: 10, photos: ['/lamp.jpg'] }));
    expect(profile.items[0]).not.toHaveProperty('interests');
    expect(profile.items[0]).not.toHaveProperty('seller');
  });

  it('shows only active, available, non-anonymous items and paginates them', async () => {
    const profile = await service.getCommunityProfile(2, 2);
    expect(listings.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
      where: { sellerId: 2, isActive: true, isSold: false, anonymous: false, quantity: MoreThan(0) },
      skip: 12, take: 12,
    }));
    expect(profile.pagination).toEqual({ page: 2, limit: 12, total: 13, totalPages: 2, hasMore: false });
  });

  it('shows WhatsApp only when the member has enabled it', async () => {
    members.findOne.mockResolvedValue({ ...member, showPhone: true });
    expect((await service.getCommunityProfile(2)).user.whatsappNumber).toBe(member.whatsappNumber);
  });

  it.each([
    null,
    { ...member, email: 'external@gmail.com' },
    { ...member, isVerified: false },
    { ...member, status: UserStatus.SUSPENDED },
  ])('does not expose missing or unavailable community accounts (%#)', async account => {
    members.findOne.mockResolvedValue(account);
    await expect(service.getCommunityProfile(2)).rejects.toThrow(NotFoundException);
    expect(listings.findAndCount).not.toHaveBeenCalled();
  });

  it('supports members with a student.1337.ma email', async () => {
    members.findOne.mockResolvedValue({ ...member, userRole: 'student', email: 'user@student.1337.ma' });
    expect((await service.getCommunityProfile(2)).user.userRole).toBe('student');
  });

  it('rejects invalid pages without accessing member data', async () => {
    await expect(service.getCommunityProfile(2, 0)).rejects.toThrow(BadRequestException);
    expect(members.findOne).not.toHaveBeenCalled();
  });
});
