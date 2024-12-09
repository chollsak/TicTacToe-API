import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) { }

  @Post('create')
  async create(@Body() createGameDto: CreateGameDto) {
    return this.gameService.createGame(createGameDto);
  }

  @Patch(':id/move')
  async makeMove(
    @Param('id') gameId: string,
    @Body() moveData: {position: number },
    @Request() req
  ) {
    const {position } = moveData;
    return this.gameService.makeMove(gameId, req.user.username, position);
  }

  @Post('/playwithbot')//create game with bot
  async playWithBot(@Request() req) {
    return this.gameService.createGameWithBot(req.user.username);
  }
  @Patch('/playwithbot/:id/move')
  async playMoveWithBot(
      @Param('id') gameId: string,
      @Body() moveData: { position: number },
      @Request() req,
  ) {
      console.log(`User ${req.user.username} is attempting to play move at position ${moveData.position} for game ${gameId}`);
      return this.gameService.makeMoveBot(gameId, req.user.username, moveData.position);
  }
  
  

  @Delete(':id')
  async endGame(@Param('id') id: string, @Request() req) {
    const res = await this.gameService.endGame(id);
    return {
      message: 'User disconnected',
      Information: res,
      notes: `User: ${req.user.username} has disconnected`
    };
  }
  

}
