import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose'; 
import { UserController } from './user.controller';
import { User, UserSchema } from './schemas/user.schema';
import { GameModule } from 'src/game/game.module';
import { StatisticModule } from 'src/statistic/statistic.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => GameModule), // Handle circular dependency
    forwardRef(() => StatisticModule), // Handle circular dependency
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
