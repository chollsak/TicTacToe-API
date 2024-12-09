import {IsEnum } from "class-validator";
import { UserStatus } from "../schemas/user-status.schema";

export class UpdateUserDto {
  @IsEnum(UserStatus)
  status?: UserStatus;
}