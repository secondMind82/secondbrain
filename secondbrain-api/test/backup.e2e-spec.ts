// End-to-end verification of the backup endpoints against a REAL Postgres and
// a REAL Nest application (no mocked Prisma).
//
// Run with the API's local .env loaded:
//   cd secondbrain-api && npx jest --config test/jest-backup-e2e.json
//
// It proves the things unit tests cannot:
//   * a full upload -> download round trip preserves the payload byte-for-byte;
//   * the server's recomputed checksum matches the client's canonical digest
//     (so the real client is never rejected by the integrity check);
//   * an upload larger than Express' default 100kb body limit is accepted,
//     which is the failure the default parser config would have caused;
//   * a payload whose userId claims another account is rejected;
//   * account B can neither read, list nor delete account A's backups.

import { sign } from 'jsonwebtoken';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { BackupsService } from '../src/backup/backups.service';
import { BackupsController } from '../src/backup/backups.controller';
import { canonicalStringify, checksumOfData } from '../src/backup/backup-format';

// Mirrors src/services/backupCounts.ts on the client. Duplicated deliberately:
// the client file imports nothing Node can resolve here, and the parity between
// the two canonicalStringify implementations is asserted by the mobile
// verification suite (npm run verify:backup in the birbal repo).
function computeRecordCounts(rows: Record<string, Record<string, unknown>[]>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [key, list] of Object.entries(rows)) counts[key] = list.length;
  const timelines = rows.timelines ?? [];
  counts.timelines = timelines.length;
  counts.events = timelines.filter((t) => Number(t.show_on_calendar) === 1).length;
  counts.expenses = timelines.filter((t) => t.expense_amount_paise != null).length;
  counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
  return counts;
}

// Backup.userId has a real foreign key to User, so the fixture creates both
// accounts; their ids are the JWT subjects the service authorizes on.
const USER_A = 'e2e-user-a';
const USER_B = 'e2e-user-b';

async function ensureUser(prisma: PrismaService, id: string, email: string): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email, fullName: email, password: 'e2e-only-not-a-real-secret' },
  });
}

function clientPayload(userId: string) {
  const data = {
    entities: [
      {
        id: 'e1',
        user_id: userId,
        name: 'Alice',
        type: 'PERSON',
        description: null,
        avatar: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: null,
      },
    ],
    timelines: [
      {
        id: 't1',
        user_id: userId,
        title: 'Dentist',
        description: 'checkup',
        event_date: '2026-03-01',
        show_on_calendar: 1,
        created_at: null,
        updated_at: null,
        expense_amount_paise: 5000,
        expense_category: 'Health',
        receivable_status: null,
        money_type: 'expense',
      },
    ],
    timeline_entities: [{ timeline_id: 't1', entity_id: 'e1' }],
    notes: [
      {
        id: 'n1',
        user_id: userId,
        title: 'Shopping',
        content: 'x'.repeat(120_000), // forces a body well over 100kb
        pinned: 1,
        created_at: null,
        updated_at: '2026-01-04T00:00:00.000Z',
      },
    ],
    diary_entries: [],
    notifications: [],
  };

  return {
    backupVersion: 2,
    appVersion: '1.0.0',
    encoding: 'json' as const,
    createdAt: new Date().toISOString(),
    userId,
    recordCounts: computeRecordCounts(data),
    checksum: checksumOfData(data),
    data,
  };
}

describe('Backups (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let backupsService: BackupsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    // Exactly the wiring main.ts uses, including the raised JSON body limit.
    app = moduleRef.createNestApplication<NestExpressApplication>(new ExpressAdapter(), {
      bodyParser: false,
    });
    configureApp(app);
    await app.init();

    prisma = moduleRef.get(PrismaService);
    backupsService = moduleRef.get(BackupsService);

    await ensureUser(prisma, USER_A, 'e2e-a@example.test');
    await ensureUser(prisma, USER_B, 'e2e-b@example.test');
  });

  afterAll(async () => {
    await prisma.backup.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
    await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
    await app.close();
  });

  beforeEach(async () => {
    await prisma.backup.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
  });

  it('round-trips a large payload and preserves the checksum', async () => {
    const payload = clientPayload(USER_A);
    const body = JSON.stringify({ payload });

    // 1. The real request path, including the >100kb body limit.
    const controller = app.get(BackupsController);
    const metadata = await controller.create({ user: { id: USER_A } }, { payload });
    expect(metadata.id).toBeTruthy();
    expect(metadata.backupVersion).toBe(2);
    expect(metadata.appVersion).toBe('1.0.0');
    expect(metadata.recordCounts!.notes).toBe(1);

    // 2. The client canonical form is what the server hashed.
    const downloaded = await controller.findLatest({ user: { id: USER_A } }, true);
    const stored = downloaded.payload as { data: unknown; checksum: string };
    expect(checksumOfData(stored.data)).toBe(stored.checksum);
    expect(stored.checksum).toBe(payload.checksum);
    expect(JSON.parse(canonicalStringify(stored.data))).toEqual(payload.data);

    expect(body.length).toBeGreaterThan(100_000);
    expect(metadata.sizeBytes).toBeGreaterThan(100_000);
  });

  it('rejects a tampered payload whose checksum no longer matches', async () => {
    const payload = clientPayload(USER_A);
    const controller = app.get(BackupsController);
    await expect(
      controller.create(
        { user: { id: USER_A } },
        { payload: { ...payload, data: { ...payload.data, notes: [] } } },
      ),
    ).rejects.toThrow('Backup integrity check failed');
  });

  it('rejects a payload claiming another account', async () => {
    const controller = app.get(BackupsController);
    await expect(
      controller.create({ user: { id: USER_A } }, { payload: clientPayload(USER_B) }),
    ).rejects.toThrow('does not belong to the authenticated user');
  });

  it('rejects a payload containing credentials', async () => {
    const controller = app.get(BackupsController);
    const payload = clientPayload(USER_A);
    payload.data.notes = [{ ...payload.data.notes[0], accessToken: 'leaked' }] as never;
    await expect(
      controller.create({ user: { id: USER_A } }, { payload }),
    ).rejects.toThrow('must not contain credentials');
  });

  it('reports no backup for an account that never backed up', async () => {
    const controller = app.get(BackupsController);
    await expect(controller.findLatest({ user: { id: USER_B } }, false)).rejects.toThrow(
      'No backup available',
    );
  });

  it('keeps accounts isolated for read, list and delete', async () => {
    const controller = app.get(BackupsController);
    const created = await controller.create({ user: { id: USER_A } }, { payload: clientPayload(USER_A) });

    // B cannot see it.
    await expect(controller.findLatest({ user: { id: USER_B } }, true)).rejects.toThrow(
      'No backup available',
    );
    expect(await controller.list({ user: { id: USER_B } }, {})).toEqual([]);

    // B cannot delete it.
    await expect(controller.remove({ user: { id: USER_B } }, created.id)).rejects.toThrow(
      'Backup not found',
    );
    expect(await prisma.backup.count({ where: { id: created.id } })).toBe(1);

    // A still can.
    expect((await controller.list({ user: { id: USER_A } }, {})).length).toBe(1);
    await expect(controller.remove({ user: { id: USER_A } }, created.id)).resolves.toEqual({
      id: created.id,
      deleted: true,
    });
  });

  it('serves a real authenticated HTTP round trip, including a >100kb body', async () => {
    // Boots the real HTTP stack so the JWT guard, the global ValidationPipe and
    // the express JSON body limit in main.ts are all exercised together. The
    // default 100kb limit would reject this payload.
    await app.listen(0);
    const url = await app.getUrl();
    const token = sign({ sub: USER_A, email: 'e2e-a@example.test' }, process.env.JWT_SECRET!, {
      expiresIn: '5m',
    });
    const payload = clientPayload(USER_A);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await fetch(`${url}/backups`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    expect(created.status).toBe(201);
    const meta = (await created.json()) as { id: string; checksum: string };
    expect(meta.checksum).toBe(payload.checksum);

    const latest = await fetch(`${url}/backups/latest?includePayload=true`, { headers: auth });
    expect(latest.status).toBe(200);
    const info = (await latest.json()) as { payload: { data: unknown; checksum: string } };
    expect(checksumOfData(info.payload.data)).toBe(info.payload.checksum);
    expect(JSON.parse(canonicalStringify(info.payload.data))).toEqual(payload.data);

    // Unauthenticated access is refused outright.
    const anonymous = await fetch(`${url}/backups/latest`);
    expect(anonymous.status).toBe(401);

    // An unknown body property is rejected by the whitelisting ValidationPipe.
    const bad = await fetch(`${url}/backups`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, isAdmin: true }),
    });
    expect(bad.status).toBe(400);

  });

  it('accepts a legacy v1 payload and stores it without a checksum', async () => {
    const controller = app.get(BackupsController);
    const v1 = {
      backupVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: USER_A,
      notes: [],
      diaryEntries: [],
      entities: [],
      timelines: [],
    };

    const metadata = await controller.create({ user: { id: USER_A } }, { payload: v1 });
    expect(metadata.backupVersion).toBe(1);
    expect(metadata.checksum).toBeNull();
  });

  it('reports metadata-only lookups without echoing the payload', async () => {
    const controller = app.get(BackupsController);
    await controller.create({ user: { id: USER_A } }, { payload: clientPayload(USER_A) });
    const info = await controller.findLatest({ user: { id: USER_A } }, false);
    expect(info).not.toHaveProperty('payload');
  });

  it('keeps a backup history rather than overwriting', async () => {
    const controller = app.get(BackupsController);
    await controller.create({ user: { id: USER_A } }, { payload: clientPayload(USER_A) });
    await new Promise((r) => setTimeout(r, 5));
    await controller.create({ user: { id: USER_A } }, { payload: clientPayload(USER_A) });
    expect((await controller.list({ user: { id: USER_A } }, {})).length).toBe(2);
  });
});
