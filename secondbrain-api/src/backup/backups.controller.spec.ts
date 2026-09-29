import { Test, TestingModule } from '@nestjs/testing';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

describe('BackupsController', () => {
  let controller: BackupsController;
  const backupsService = {
    create: jest.fn(),
    findLatest: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackupsController],
      providers: [{ provide: BackupsService, useValue: backupsService }],
    }).compile();

    controller = module.get<BackupsController>(BackupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a backup for the authenticated user', () => {
    backupsService.create.mockReturnValue({ id: 'backup-1' });
    controller.create({ user: { id: 'user-1' } }, { payload: { backupVersion: 2 } });
    expect(backupsService.create).toHaveBeenCalledWith('user-1', {
      payload: { backupVersion: 2 },
    });
  });

  it('only includes the payload when explicitly requested', () => {
    backupsService.findLatest.mockReturnValue({ id: 'backup-1' });

    controller.findLatest({ user: { id: 'user-1' } }, undefined);
    expect(backupsService.findLatest).toHaveBeenCalledWith('user-1', false);

    controller.findLatest({ user: { id: 'user-1' } }, true);
    expect(backupsService.findLatest).toHaveBeenLastCalledWith('user-1', true);
  });

  it('lists backups for the authenticated user only', () => {
    backupsService.list.mockReturnValue([]);
    controller.list({ user: { id: 'user-1' } }, { take: 5 });
    expect(backupsService.list).toHaveBeenCalledWith('user-1', 5);
  });

  it('deletes a backup scoped to the authenticated user', () => {
    backupsService.remove.mockReturnValue({ id: 'backup-1', deleted: true });
    controller.remove({ user: { id: 'user-1' } }, 'backup-1');
    expect(backupsService.remove).toHaveBeenCalledWith('user-1', 'backup-1');
  });
});
