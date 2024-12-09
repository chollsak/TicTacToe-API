import { IsNotEmpty, IsMongoId, IsOptional, IsInt, Min } from 'class-validator';

export class CreateStatisticDto {
  @IsNotEmpty()
  @IsMongoId()
  user: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gamesPlayed?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gamesWon?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gamesLost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gamesDraw?: number;
}
