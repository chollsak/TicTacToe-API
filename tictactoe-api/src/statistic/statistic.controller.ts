import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('statistic')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Post()
  async create(@Body() createStatisticDto: CreateStatisticDto) {
    return this.statisticService.createStatistic(createStatisticDto);
  }

  @Get()
  async findOne(@Request() req) {
    const res = await this.statisticService.findAll(req.user.username);
    return {
      message: 'User statistics',
      statistics: res
    };
  }

}

