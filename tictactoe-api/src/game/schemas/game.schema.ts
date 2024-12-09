import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import * as mongoose from "mongoose";

export type GameDocument = HydratedDocument<Game>;

@Schema()
export class Game {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    player1: string;

    @Prop({
        type: mongoose.Schema.Types.Mixed,
        required: true,
    })
    player2: string | Types.ObjectId;


    @Prop({ required: true, default: () => new Date() })
    startedAt: Date;

    @Prop()
    finishedAt?: Date;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    winner?: string | Types.ObjectId;
    

    @Prop({ type: [{ player: String, position: Number, timestamp: Date }] })
    moves: { player: string; position: number; timestamp: Date }[];

    _id: Types.ObjectId;
}

export const GameSchema = SchemaFactory.createForClass(Game);

GameSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
