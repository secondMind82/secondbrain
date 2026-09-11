import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotesModule } from './notes/notes.module';
import { EntitiesModule } from './entities/entities.module';
import { TimelineModule } from './timeline/timeline.module';
import { DiaryModule } from './diary/diary.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Core
    PrismaModule,

    // Features
    AuthModule,
    UsersModule,
    DashboardModule,
    NotesModule,
    EntitiesModule,
    TimelineModule,
    DiaryModule,
    PurchasesModule,
    AiModule,
  ],

  controllers: [AppController, HealthController],

  providers: [AppService],
})
export class AppModule {}
