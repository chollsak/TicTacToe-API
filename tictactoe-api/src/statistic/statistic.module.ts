import { Module, forwardRef } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { StatisticController } from './statistic.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { StatisticSchema } from './schemas/statistic.schema';
import { UserModule } from 'src/user/user.module';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Statistic', schema: StatisticSchema }]),
    forwardRef(() => UserModule), // Handle circular dependency
    forwardRef(() => GameModule), // Handle circular dependency
  ],
  controllers: [StatisticController],
  providers: [StatisticService],
  exports: [StatisticService, MongooseModule],
})
export class StatisticModule {}
