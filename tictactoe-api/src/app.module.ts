import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GameModule } from './game/game.module';
import { StatisticModule } from './statistic/statistic.module';
import { InvitationModule } from './invitation/invitation.module';

@Module({
  imports: [AuthModule, UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI, {
      user: process.env.MONGO_USER,
      pass: process.env.MONGO_PASS,
      dbName: process.env.MONGO_DB,
    }),
    GameModule,
    StatisticModule,
    InvitationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
