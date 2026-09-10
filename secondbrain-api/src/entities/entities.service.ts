import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

@Injectable()
export class EntitiesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateEntityDto) {
    const normalizedName = dto.name.trim().toLowerCase();

    const entities = await this.prisma.entity.findMany({
      where: {
        userId,
      },
    });

    const existingEntity = entities.find(
      (entity) => entity.name.trim().toLowerCase() === normalizedName,
    );

    if (existingEntity) {
      throw new ConflictException('Entity already exists');
    }

    return this.prisma.entity.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        description: dto.description,
        avatar: dto.avatar,
        userId,
      },
    });
  }

  async findAll(userId: string, search?: string) {
    return this.prisma.entity.findMany({
      where: {
        userId,

        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {}),
      },

      orderBy: {
        updatedAt: 'asc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const entity = await this.prisma.entity.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return entity;
  }

  async getTimelines(entityId: string, userId: string) {
    await this.findOne(entityId, userId);

    return this.prisma.timeline.findMany({
      where: {
        userId,

        entities: {
          some: {
            entityId,
          },
        },
      },

      include: {
        entities: {
          include: {
            entity: true,
          },
        },
      },

      orderBy: {
        eventDate: 'desc',
      },
    });
  }
  async update(id: string, userId: string, dto: UpdateEntityDto) {
    const entity = await this.prisma.entity.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return this.prisma.entity.update({
      where: {
        id,
      },
      data: {
        ...dto,
      },
    });
  }

  async remove(id: string, userId: string) {
    const entity = await this.prisma.entity.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    await this.prisma.entity.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Entity deleted successfully',
    };
  }
  async getStats(userId: string) {
    const [people, companies, total] = await Promise.all([
      this.prisma.entity.count({
        where: {
          userId,
          type: 'PERSON',
        },
      }),

      this.prisma.entity.count({
        where: {
          userId,
          type: 'COMPANY',
        },
      }),

      this.prisma.entity.count({
        where: {
          userId,
        },
      }),
    ]);

    return {
      people,
      companies,
      total,
    };
  }

async getProfile(id: string, userId: string) {
  const entity = await this.prisma.entity.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!entity) {
    throw new NotFoundException('Entity not found');
  }

  const [timelines, purchases] =
    await Promise.all([
      this.prisma.timeline.findMany({
        where: {
          userId,

          entities: {
            some: {
              entityId: id,
            },
          },
        },

        include: {
          entities: {
            include: {
              entity: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },

        orderBy: {
          eventDate: 'desc',
        },
      }),

      this.prisma.purchase.findMany({
        where: {
          userId,
          entityId: id,
        },

        include: {
          items: true,
        },

        orderBy: {
          purchaseDate: 'desc',
        },
      }),
    ]);

  return {
    entity,

    stats: {
      timelineCount: timelines.length,

      firstEvent:
        timelines.length > 0
          ? timelines[timelines.length - 1].eventDate
          : null,

      lastEvent:
        timelines.length > 0
          ? timelines[0].eventDate
          : null,
    },

    timelines,

    purchases,
  };
}
}
