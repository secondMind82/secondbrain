import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { BackupsService } from './backups.service';
import { PrismaService } from '../prisma/prisma.service';
import { checksumOfData } from './backup-format';

function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'backup-1',
    backupVersion: 2,
    sizeBytes: 10,
    createdAt: new Date('2026-09-28T12:30:00.000Z'),
    updatedAt: new Date('2026-09-28T12:30:00.000Z'),
    appVersion: '1.0.0',
    checksum: null,
    encoding: 'json',
    recordCounts: {},
    ...overrides,
  };
}

describe('BackupsService', () => {
  let service: BackupsService;
  let prisma: {
    backup: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      backup: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BackupsService, { provide: PrismaService, useValue: prisma }],
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

    it('rejects a missing backup version', async () => {
      await expect(service.create('user-1', { payload: {} })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a payload claiming another user ownership', async () => {
      await expect(
        service.create('user-1', { payload: { backupVersion: 2, userId: 'user-2' } }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('stores the backup under the authenticated user id', async () => {
      prisma.backup.create.mockResolvedValue(storedRow());

      await service.create('user-1', {
        payload: {
          backupVersion: 2,
          userId: 'user-1',
          data: { entities: [], timelines: [], notes: [], diaryEntries: [] },
        },
      });

      expect(prisma.backup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', backupVersion: 2 }),
        }),
      );
    });

    it('persists provenance and record counts metadata', async () => {
      prisma.backup.create.mockResolvedValue(storedRow());

      await service.create('user-1', {
        payload: {
          backupVersion: 2,
          appVersion: '1.2.3',
          encoding: 'json',
          recordCounts: { entities: 10, timelines: 50 },
          data: {},
        },
      });

      expect(prisma.backup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appVersion: '1.2.3',
            encoding: 'json',
            recordCounts: { entities: 10, timelines: 50 },
          }),
        }),
      );
    });

    it('rejects an unsupported encoding', async () => {
      await expect(
        service.create('user-1', { payload: { backupVersion: 2, encoding: 'rot13' } }),
      ).rejects.toThrow('Unsupported backup encoding');
    });

    it('rejects gzip+base64, which nothing in the system can decompress', async () => {
      // Accepting it would let a backup in that form be stored with a checksum
      // that no client can ever reproduce, making it permanently unrestorable.
      await expect(
        service.create('user-1', {
          payload: { backupVersion: 2, encoding: 'gzip+base64', data: { notes: [] } },
        }),
      ).rejects.toThrow('Unsupported backup encoding');
    });

    it('rejects a payload carrying credentials', async () => {
      await expect(
        service.create('user-1', {
          payload: {
            backupVersion: 2,
            data: { notes: [{ id: 'n1', accessToken: 'leaked' }] },
          },
        }),
      ).rejects.toThrow('must not contain credentials');
      expect(prisma.backup.create).not.toHaveBeenCalled();
    });

    it('accepts a matching checksum', async () => {
      const data = { entities: [{ id: 'e1' }] };
      prisma.backup.create.mockResolvedValue(storedRow({ checksum: checksumOfData(data) }));

      const meta = await service.create('user-1', {
        payload: { backupVersion: 2, data, checksum: checksumOfData(data) },
      });

      expect(meta.checksum).toBe(checksumOfData(data));
    });

    it('rejects a payload whose checksum does not match its data', async () => {
      await expect(
        service.create('user-1', {
          payload: { backupVersion: 2, data: { entities: [] }, checksum: 'deadbeef' },
        }),
      ).rejects.toThrow('Backup integrity check failed');
      expect(prisma.backup.create).not.toHaveBeenCalled();
    });

    it('rejects an oversized payload', async () => {
      const huge = { backupVersion: 2, data: { blob: 'x'.repeat(13 * 1024 * 1024) } };
      await expect(service.create('user-1', { payload: huge })).rejects.toThrow(
        PayloadTooLargeException,
      );
    });
  });

  describe('findLatest', () => {
    it('throws NotFound when the user has no backup', async () => {
      prisma.backup.findFirst.mockResolvedValue(null);
      await expect(service.findLatest('user-1', false)).rejects.toThrow(NotFoundException);
    });

    it('scopes the query to the authenticated user', async () => {
      prisma.backup.findFirst.mockResolvedValue(
        storedRow({ payload: { backupVersion: 2 } }),
      );

      await service.findLatest('user-1', true);

      expect(prisma.backup.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('omits the payload unless requested', async () => {
      prisma.backup.findFirst.mockResolvedValue(
        storedRow({ payload: { backupVersion: 2, data: {} } }),
      );

      const withoutPayload = await service.findLatest('user-1', false);
      expect(withoutPayload).not.toHaveProperty('payload');

      const withPayload = await service.findLatest('user-1', true);
      expect(withPayload.payload).toEqual({ backupVersion: 2, data: {} });
    });
  });

  describe('list', () => {
    it('scopes history to the authenticated user and clamps the page size', async () => {
      prisma.backup.findMany.mockResolvedValue([storedRow()]);

      await service.list('user-1', 5000);

      expect(prisma.backup.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });
  });

  describe('remove', () => {
    it('deletes only when the row belongs to the caller', async () => {
      prisma.backup.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.remove('user-1', 'backup-1')).resolves.toEqual({
        id: 'backup-1',
        deleted: true,
      });
      expect(prisma.backup.deleteMany).toHaveBeenCalledWith({
        where: { id: 'backup-1', userId: 'user-1' },
      });
    });

    it('reports NotFound when another account owns the id', async () => {
      prisma.backup.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.remove('user-2', 'backup-1')).rejects.toThrow(NotFoundException);
    });
  });
});
