import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    userId: string,
    dto: CreatePurchaseDto,
  ) {
    const totalAmount = dto.items.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0,
    );

    return this.prisma.$transaction(
      async (tx) => {

        // Make sure the selected entity belongs
        // to the currently logged-in user.
        if (dto.entityId) {
          const entity = await tx.entity.findFirst({
            where: {
              id: dto.entityId,
              userId,
            },
          });

          if (!entity) {
            throw new BadRequestException(
              'Entity not found',
            );
          }
        }

        const purchase =
          await tx.purchase.create({
            data: {
              title: dto.title,

              totalAmount,

              purchaseDate: dto.purchaseDate
                ? new Date(dto.purchaseDate)
                : new Date(),

              user: {
                connect: {
                  id: userId,
                },
              },

              entity: dto.entityId
                ? {
                    connect: {
                      id: dto.entityId,
                    },
                  }
                : undefined,

              items: {
                create: dto.items.map(
                  (item) => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                  }),
                ),
              },
            },

            include: {
              items: true,
              entity: true,
            },
          });

        return purchase;
      },
    );
  }
}