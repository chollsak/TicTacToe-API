import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateGameDto {
  @IsNotEmpty()
  @IsString()
  player1: string;

  @IsNotEmpty()
  @IsString()
  player2: string; 

  @IsOptional()
  @IsString()
  startedAt?: Date; 

  @IsOptional()
  moves?: { player: string; position: number; timestamp: Date }[]; 

}
