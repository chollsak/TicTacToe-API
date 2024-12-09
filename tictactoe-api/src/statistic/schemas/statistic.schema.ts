import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StatisticDocument = HydratedDocument<Statistic>;

@Schema()
export class Statistic {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: string;

  @Prop({ default: 0 })
  gamesPlayed: number;

  @Prop({ default: 0 })
  gamesWon: number;

  @Prop({ default: 0 })
  gamesLost: number;

  @Prop({ default: 0 })
  gamesDraw: number;
}

export const StatisticSchema = SchemaFactory.createForClass(Statistic);

StatisticSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret._id) {
      ret.id = ret._id;
    }
    delete ret._id;
    delete ret.__v;
  }
});

