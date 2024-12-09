import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Game, GameDocument } from './schemas/game.schema';
import { Model} from 'mongoose';
import { UserDocument} from 'src/user/schemas/user.schema';
import { User } from 'src/user/schemas/user.schema';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { UserStatus } from 'src/user/schemas/user-status.schema';
import { Statistic, StatisticDocument } from 'src/statistic/schemas/statistic.schema';

@Injectable()
export class GameService {
  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Statistic.name) private statisticModel: Model<StatisticDocument>,
) {}

  async createGame(createGameDto: CreateGameDto): Promise<Game> {

    const {player1, player2} = createGameDto;
    const updateUserDto:UpdateUserDto = {status: UserStatus.INGAME};

    await this.userModel.findByIdAndUpdate(player1, updateUserDto).exec();
    await this.userModel.findByIdAndUpdate(player2, updateUserDto).exec();

    console.log(player1, player2, "They are playing")

    const newGame = new this.gameModel({
      ...createGameDto,
      startedAt: createGameDto.startedAt || new Date(), 
    });

    return newGame.save();
  }

  // Create a new game with the bot
  async createGameWithBot(username: string): Promise<{ gameId: string }> {
    // Find the player
    const player = await this.userModel.findOne({ username }).exec();
    if (!player) {
      throw new BadRequestException('Player not found');
    }

    // Create a new game where player2 is the bot
    const newGame = new this.gameModel({
      player1: player._id,
      player2: 'BOT',
      startedAt: new Date(),
      moves: [],
    });

    const savedGame = await newGame.save();

    return { gameId: savedGame._id.toString() };
  }

  async makeMove(gameId: string, username: string, position: number): Promise<Game> {
    const session = await this.gameModel.db.startSession();
    session.startTransaction();

    try {
        const game = await this.gameModel
            .findById(gameId)
            .session(session)
            .exec();
        if (!game) {
            throw new BadRequestException('Game not found');
        }

        const player = await this.userModel.findOne({ username }).exec();
        if (!player) {
            throw new BadRequestException('Player not found');
        }

        const playerId = player._id.toString();

        // Determine whose turn it is
        const isFirstMove = game.moves.length === 0;
        const lastMovePlayerId = game.moves.length > 0 ? game.moves[game.moves.length - 1].player : null;
        const currentTurnPlayerId = isFirstMove
            ? game.player2.toString() // Receiver must play first
            : lastMovePlayerId === game.player1.toString()
            ? game.player2.toString()
            : game.player1.toString();

        if (currentTurnPlayerId !== playerId) {
            throw new BadRequestException('Not your turn');
        }

        // Check if the position is already occupied
        if (game.moves.some((move) => move.position === position)) {
            throw new BadRequestException('Position already occupied');
        }

        // Record the move
        game.moves.push({
            player: playerId,
            position,
            timestamp: new Date(),
        });

        // Get the board state and check for a winner
        const board = this.getBoardFromMoves(game.moves);
        const winner = this.checkWinner(this.mapMovesToPlayer(board), game.player1.toString(), game.player2.toString());

        if (winner) {
            game.winner = winner === game.player1.toString() ? game.player1 : game.player2;
            game.finishedAt = new Date();

            // Update statistics
            await this.updateStatistics(game);
        } else if (game.moves.length === 9) {
            game.finishedAt = new Date();
            game.winner = null; // Draw
            await this.updateStatistics(game);
        }

        // Update player statuses
        const updateUserDto: UpdateUserDto = { status: UserStatus.AVAILABLE };
        await this.userModel.findByIdAndUpdate(game.player1, updateUserDto).exec();
        await this.userModel.findByIdAndUpdate(game.player2, updateUserDto).exec();

        // Save the game state and commit the transaction
        await game.save({ session });
        await session.commitTransaction();

        return game;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}




  // Update player statistics after the game ends
  private async updateStatistics(game: Game): Promise<void> {
    // Update statistics for player1
    if (game.player1 !== 'BOT') {
      const player1Stat = await this.statisticModel.findOneAndUpdate(
        { user: game.player1 },
        { $inc: { gamesPlayed: 1 } },
        { upsert: true, new: true },
      ).exec();

      if (game.winner === game.player1) {
        player1Stat.gamesWon++;
      } else if (!game.winner) {
        player1Stat.gamesDraw++;
      } else {
        player1Stat.gamesLost++;
      }
      await player1Stat.save();
    }

    // Update statistics for player2
    if (game.player2 !== 'BOT') {
      const player2Stat = await this.statisticModel.findOneAndUpdate(
        { user: game.player2 },
        { $inc: { gamesPlayed: 1 } },
        { upsert: true, new: true },
      ).exec();

      if (game.winner === game.player2) {
        player2Stat.gamesWon++;
      } else if (!game.winner) {
        player2Stat.gamesDraw++;
      } else {
        player2Stat.gamesLost++;
      }
      await player2Stat.save();
    }
  }

  private getBoardFromMoves(moves: { player: string; position: number }[]): string[] {
    const board = Array(9).fill(null);
    moves.forEach((move) => {
        board[move.position] = move.player; // Use player ID directly
    });
    return board;
}


  // Map moves to player positions
  private mapMovesToPlayer(board: string[]): { playerId: string; position: number }[] {
    return board
      .map((player, position) => (player ? { playerId: player, position } : null))
      .filter((move) => move !== null) as { playerId: string; position: number }[];
  }

  private checkWinner(moves: { playerId: string; position: number }[], player1: string, player2: string): string | null {
    const winConditions = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    const positionsByPlayer: { [key: string]: number[] } = {};

    // Populate positions by player
    moves.forEach((move) => {
      if (!positionsByPlayer[move.playerId]) {
        positionsByPlayer[move.playerId] = [];
      }
      positionsByPlayer[move.playerId].push(move.position);
    });

    // Check win conditions for each player
    for (const player of [player1, player2]) {
      for (const condition of winConditions) {
        const isWinning = condition.every((pos) => positionsByPlayer[player]?.includes(pos));
        if (isWinning) {
          return player; // Return the winner's ID
        }
      }
    }

    return null; // Return null if no winner is found
}


  // Minimax algorithm for bot's best move
  private getBestMove(board: string[], botSymbol: string): number {
    const humanSymbol = botSymbol === 'X' ? 'O' : 'X';

    const isMovesLeft = (board: string[]) => board.includes(null);

    const evaluate = (b: string[]) => {
      const winConditions = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ];
      for (const [a, b, c] of winConditions) {
        if (b[a] && b[a] === b[b] && b[a] === b[c]) {
          return b[a] === botSymbol ? 10 : -10;
        }
      }
      return 0;
    };

    const minimax = (b: string[], depth: number, isMax: boolean): number => {
      const score = evaluate(b);

      if (score === 10) return score - depth;
      if (score === -10) return score + depth;
      if (!isMovesLeft(b)) return 0;

      if (isMax) {
        let best = -Infinity;
        for (let i = 0; i < b.length; i++) {
          if (b[i] === null) {
            b[i] = botSymbol;
            best = Math.max(best, minimax(b, depth + 1, false));
            b[i] = null;
          }
        }
        return best;
      } else {
        let best = Infinity;
        for (let i = 0; i < b.length; i++) {
          if (b[i] === null) {
            b[i] = humanSymbol;
            best = Math.min(best, minimax(b, depth + 1, true));
            b[i] = null;
          }
        }
        return best;
      }
    };

    let bestVal = -Infinity;
    let bestMove = -1;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = botSymbol;
        const moveVal = minimax(board, 0, false);
        board[i] = null;
        if (moveVal > bestVal) {
          bestVal = moveVal;
          bestMove = i;
        }
      }
    }
    return bestMove;
  }

  
  async endGame(gameId: string): Promise<Game> {
    // Fetch the game to validate and reset player statuses
    const game = await this.gameModel.findById(gameId).exec();
    if (!game) {
      throw new BadRequestException('Game not found');
    }
  
    const updateUserDto: UpdateUserDto = { status: UserStatus.AVAILABLE };
  
    // Reset the status of the players
    if (game.player1 !== 'BOT') {
      await this.userModel.findByIdAndUpdate(game.player1, updateUserDto).exec();
    }
    if (game.player2 !== 'BOT') {
      await this.userModel.findByIdAndUpdate(game.player2, updateUserDto).exec();
    }

    await this.updateStatistics(game);
  
    // Update the end time of the game
    const updatedGame = await this.gameModel
      .findByIdAndUpdate(gameId, { finishedAt: new Date() }, { new: true })
      .exec();
  
    return updatedGame; // Return the updated game directly
  }

  async getGameById(gameId: string): Promise<Game> {
    try {
        const game = await this.gameModel.findById(gameId).exec();
        if (!game) {
            throw new BadRequestException('Game not found');
        }
        return game;
    } catch (error) {
        throw new BadRequestException(`Failed to fetch game: ${error.message}`);
    }
}

  

   // Example method using UserService
   async getGamesByUserId(userId: string): Promise<Game[]> {
    return this.gameModel.find({
      $or: [{ player1: userId }, { player2: userId }],
    }).exec();
  }

  async playWithBot(gameId: string): Promise<Game> {
    const session = await this.gameModel.db.startSession();
    session.startTransaction();

    try {
        console.log(`Fetching game with ID: ${gameId}`);
        const game = await this.gameModel.findById(gameId).session(session).exec();

        if (!game) {
            console.log('Game not found.');
            throw new BadRequestException('Game not found');
        }

        console.log('Game fetched successfully:', game);

        const isFirstMove = game.moves.length === 0;
        const lastMovePlayerId = game.moves.length > 0 ? game.moves[game.moves.length - 1].player : null;

        console.log(`Is first move: ${isFirstMove}, Last move player ID: ${lastMovePlayerId}`);

        if (isFirstMove) {
            console.log('User must play the first move.');
            await session.abortTransaction();
            throw new BadRequestException("User must play the first move.");
        }

        const botShouldMove =
            lastMovePlayerId !== 'BOT' &&
            game.moves.length % 2 !== 0 && // Bot moves on odd moves
            game.player2 === 'BOT';

        console.log(`Bot should move: ${botShouldMove}`);

        if (!botShouldMove) {
            console.log('It is not the bot’s turn. Exiting bot play.');
            await session.abortTransaction();
            return game;
        }

        const board = this.getBoardFromMovesBot(game.moves);
        console.log('Current board state:', board);

        const botMove = this.getBestMoveBot(board, 'O');
        console.log(`Bot selected move position: ${botMove}`);

        if (botMove === -1) {
            console.log('No valid moves left for the bot.');
            throw new BadRequestException('No valid moves left for the bot.');
        }

        game.moves.push({
            player: 'BOT',
            position: botMove,
            timestamp: new Date(),
        });

        console.log('Bot move recorded:', game.moves);

        const updatedBoard = this.getBoardFromMovesBot(game.moves);
        const winner = this.checkWinnerBot(this.mapMovesToPlayerBot(updatedBoard));

        console.log('Checking winner after bot move:', winner);

        if (winner) {
            game.winner = 'BOT';
            game.finishedAt = new Date();
            console.log('Bot won the game.');
        } else if (game.moves.length === 9) {
            game.finishedAt = new Date();
            game.winner = null;
            console.log('Game ended in a draw.');
        }

        await game.save({ session });
        console.log('Game state saved.');

        await session.commitTransaction();
        return game;
    } catch (error) {
        console.log('Error occurred:', error.message);
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}


  private getBoardFromMovesBot(moves: { player: string; position: number }[]): string[] {
    const board = Array(9).fill(null);
    moves.forEach((move) => {
      board[move.position] = move.player === 'BOT' ? 'O' : 'X';
    });
    return board;
  }

  private mapMovesToPlayerBot(board: string[]): { playerId: string; position: number }[] {
    return board
      .map((player, position) => (player ? { playerId: player, position } : null))
      .filter((move) => move !== null) as { playerId: string; position: number }[];
  }

  private checkWinnerBot(moves: { playerId: string; position: number }[]): string | null {
    const winConditions = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    const positionsByPlayer: { [key: string]: number[] } = {};

    for (const move of moves) {
      if (!positionsByPlayer[move.playerId]) {
        positionsByPlayer[move.playerId] = [];
      }
      positionsByPlayer[move.playerId].push(move.position);
    }

    for (const playerId of Object.keys(positionsByPlayer)) {
      for (const condition of winConditions) {
        if (condition.every((pos) => positionsByPlayer[playerId].includes(pos))) {
          return playerId;
        }
      }
    }

    return null;
  }

  private getBestMoveBot(board: string[], botSymbol: string): number {
    const humanSymbol = botSymbol === 'X' ? 'O' : 'X';

    const isMovesLeft = (board: string[]) => board.includes(null);

    const evaluate = (b: string[]) => {
      const winConditions = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ];
      for (const [a, b, c] of winConditions) {
        if (b[a] && b[a] === b[b] && b[a] === b[c]) {
          return b[a] === botSymbol ? 10 : -10;
        }
      }
      return 0;
    };

    const minimax = (b: string[], depth: number, isMax: boolean): number => {
      const score = evaluate(b);

      if (score === 10) return score - depth;
      if (score === -10) return score + depth;
      if (!isMovesLeft(b)) return 0;

      if (isMax) {
        let best = -Infinity;
        for (let i = 0; i < b.length; i++) {
          if (b[i] === null) {
            b[i] = botSymbol;
            best = Math.max(best, minimax(b, depth + 1, false));
            b[i] = null;
          }
        }
        return best;
      } else {
        let best = Infinity;
        for (let i = 0; i < b.length; i++) {
          if (b[i] === null) {
            b[i] = humanSymbol;
            best = Math.min(best, minimax(b, depth + 1, true));
            b[i] = null;
          }
        }
        return best;
      }
    };

    let bestVal = -Infinity;
    let bestMove = -1;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = botSymbol;
        const moveVal = minimax(board, 0, false);
        board[i] = null;
        if (moveVal > bestVal) {
          bestVal = moveVal;
          bestMove = i;
        }
      }
    }
    return bestMove;
  }

  async makeMoveBot(gameId: string, username: string, position: number): Promise<Game> {
    const session = await this.gameModel.db.startSession();
    session.startTransaction();

    try {
        // Fetch the game and lock it during this operation
        const game = await this.gameModel.findById(gameId).session(session).exec();

        if (!game) {
            throw new BadRequestException('Game not found');
        }

        // Ensure the game involves a bot
        if (game.player2 !== 'BOT') {
            throw new BadRequestException('This game is not configured for playing with a bot.');
        }

        // Find the player making the move
        const player = await this.userModel.findOne({ username }).exec();
        if (!player) {
            throw new BadRequestException('Player not found');
        }

        const playerId = player._id.toString();

        // Validate player's turn
        const isFirstMove = game.moves.length === 0;
        const lastMovePlayerId = game.moves.length > 0 ? game.moves[game.moves.length - 1].player : null;

        if (isFirstMove && game.player1.toString() !== playerId) {
            throw new BadRequestException('User must make the first move.');
        }

        const currentTurnPlayerId = isFirstMove
            ? game.player1.toString() // First move by player1
            : lastMovePlayerId === game.player1.toString()
            ? 'BOT'
            : game.player1.toString();

        if (currentTurnPlayerId !== playerId) {
            throw new BadRequestException('Not your turn.');
        }

        // Check if the position is already occupied
        if (game.moves.some((move) => move.position === position)) {
            throw new BadRequestException('Position already occupied.');
        }

        // Record the player's move
        game.moves.push({
            player: playerId,
            position,
            timestamp: new Date(),
        });

        // Check if the player wins
        const board = this.getBoardFromMovesBot(game.moves);
        const winner = this.checkWinnerBot(this.mapMovesToPlayerBot(board));

        if (winner) {
            game.winner = winner === 'X' ? game.player1 : 'BOT';
            game.finishedAt = new Date();
            await game.save({ session });
            await session.commitTransaction();
            return game;
        }

        // If the game is ongoing, bot makes a move
        const botMove = this.getBestMoveBot(board, 'O');
        if (botMove === -1) {
            // Check for a draw
            game.winner = null;
            game.finishedAt = new Date();
            await game.save({ session });
            await session.commitTransaction();
            return game;
        }

        // Record the bot's move
        game.moves.push({
            player: 'BOT',
            position: botMove,
            timestamp: new Date(),
        });

        // Check if the bot wins
        const updatedBoard = this.getBoardFromMovesBot(game.moves);
        const botWinner = this.checkWinnerBot(this.mapMovesToPlayerBot(updatedBoard));

        if (botWinner) {
            game.winner = 'BOT';
            game.finishedAt = new Date();
        } else if (game.moves.length === 9) {
            // Check for a draw
            game.winner = null;
            game.finishedAt = new Date();
        }

        // Save the updated game state
        await game.save({ session });
        await session.commitTransaction();
        return game;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}


}