import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { use } from 'passport';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async create(@Body() registerDto: RegisterDto) {
    const res = await this.userService.create(registerDto);
    return {
      message: 'User created',
      user: res
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = req.user;
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async findAll() {
    const res = await this.userService.findAll();
    return {
      message: 'All users',
      users: res
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(@Request() req) {
    const res = await this.userService.viewHistory(req.user.username);
    return {
      message: 'User history',
      history: res
    };
  }

}
