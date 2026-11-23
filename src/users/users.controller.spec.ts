/// <reference types="jest" />
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

describe('Community profile routes', () => {
  const currentUser = { id: 1 } as User;
  let service: { getUserProfile: jest.Mock; getUserItems: jest.Mock; getCommunityProfile: jest.Mock };
  let controller: UsersController;

  beforeEach(() => {
    service = {
      getUserProfile: jest.fn().mockResolvedValue({ user: { id: 1 }, stats: { savedItemsCount: 5 } }),
      getUserItems: jest.fn().mockResolvedValue([]),
      getCommunityProfile: jest.fn().mockResolvedValue({ user: { id: 2 }, items: [{ id: 10 }] }),
    };
    controller = new UsersController(service as any);
  });

  it('keeps the complete personal profile available to its owner', async () => {
    await expect(controller.getUserProfile(1, currentUser)).resolves.toHaveProperty('stats.savedItemsCount', 5);
    expect(service.getCommunityProfile).not.toHaveBeenCalled();
  });

  it('keeps personal listing management available', async () => {
    await expect(controller.getUserItems(1, currentUser)).resolves.toEqual([]);
    expect(service.getUserItems).toHaveBeenCalledWith(1);
  });

  it('uses the public field projection when viewing another member', async () => {
    await expect(controller.getUserProfile(2, currentUser)).resolves.toHaveProperty('user.id', 2);
    expect(service.getUserProfile).not.toHaveBeenCalled();
    expect(service.getCommunityProfile).toHaveBeenCalledWith(2);
  });

  it('uses public listings when viewing another member items', async () => {
    await expect(controller.getUserItems(2, currentUser)).resolves.toEqual([{ id: 10 }]);
    expect(service.getUserItems).not.toHaveBeenCalled();
  });

  it('forwards pagination to the community profile service', async () => {
    await controller.getCommunityProfile(2, 3);
    expect(service.getCommunityProfile).toHaveBeenCalledWith(2, 3);
  });
});
