import { IsEnum, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { InvitationStatus } from '../schemas/invitation-status.schema';
import { Types } from 'mongoose';

export class CreateInvitationDto {
  @IsNotEmpty()
  @IsOptional()
  @IsMongoId()
  sender: string;

  @IsNotEmpty()
  @IsMongoId()
  receiver: string;

  @IsOptional()
  @IsMongoId()
  gameId?: Types.ObjectId;

  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: string;
}

