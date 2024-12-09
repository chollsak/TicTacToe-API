import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InvitationStatus } from './invitation-status.schema';

export type InvitationDocument = HydratedDocument<Invitation>;

@Schema({timestamps: true})
export class Invitation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: string; 

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiver: string; 

  @Prop({ type: Types.ObjectId, ref: 'Game' })
  gameId?: Types.ObjectId; 

  @Prop({ required: true, enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: string; 
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

InvitationSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret._id) {
      ret.id = ret._id;
    }
    delete ret._id;
    delete ret.__v;
  }
});