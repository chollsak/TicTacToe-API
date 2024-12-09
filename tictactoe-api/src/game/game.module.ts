import { Module, forwardRef } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { GameSchema } from './schemas/game.schema';
import { UserModule } from 'src/user/user.module';
import { StatisticModule } from 'src/statistic/statistic.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Game', schema: GameSchema }]),
    forwardRef(() => UserModule), // Handle circular dependency
    forwardRef(() => StatisticModule), // Handle circular dependency
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
