import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BackupsService } from './backups.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BackupsService', () => {
  let service: BackupsService;
  let prisma: {
    backup: {
      create: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      backup: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BackupsService>(BackupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('rejects an unsupported backup version', async () => {
      await expect(
        service.create('user-1', { payload: { backupVersion: 999, userId: 'user-1' } }),
      ).rejects.toThrow('Unsupported backup version');
    });

    it('rejects a payload claiming another user ownership', async () => {
      await expect(
        service.create('user-1', {
          payload: { backupVersion: 1, userId: 'user-2' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('stores the backup under the authenticated user id', async () => {
      prisma.backup.create.mockResolvedValue({
        id: 'backup-1',
        backupVersion: 1,
        sizeBytes: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create('user-1', {
        payload: { backupVersion: 1, notes: [], diaryEntries: [], entities: [], timelines: [] },
      });

      expect(prisma.backup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', backupVersion: 1 }),
        }),
      );
    });
  });

  describe('findLatest', () => {
    it('throws NotFound when the user has no backup', async () => {
      prisma.backup.findFirst.mockResolvedValue(null);
      await expect(service.findLatest('user-1', false)).rejects.toThrow(NotFoundException);
    });

    it('scopes the query to the authenticated user', async () => {
      prisma.backup.findFirst.mockResolvedValue({
        id: 'backup-1',
        backupVersion: 1,
        sizeBytes: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        payload: { backupVersion: 1 },
      });

      await service.findLatest('user-1', true);

      expect(prisma.backup.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});