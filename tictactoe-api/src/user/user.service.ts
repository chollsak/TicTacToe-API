import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { User, UserDocument } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RegisterDto } from './dto/register.dto';
import { GameService } from 'src/game/game.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly gameService: GameService,
  ) {}

  async create(registerDto: RegisterDto): Promise<User> {
    if (await this.findByEmail(registerDto.email)) {
      throw new BadRequestException('Email already in use');
    }

    if (await this.findByUsername(registerDto.username)) {
      throw new BadRequestException('Username already in use');
    }

    const newUser = new this.userModel(registerDto);
    return newUser.save();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.userModel.findOne({ username }).exec();
    if (user) {
      throw new BadRequestException(`User with username "${username}" in used`);
    }
    return user;
  }

  async findUsername(username: string): Promise<User | null> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) {
      throw new BadRequestException(`User with username "${username}" not found`);
    }
    return user;
  }

  async findIdByUsername(username: string): Promise<User> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) {
      throw new BadRequestException(`User with username "${username}" not found`);
    }
    return user; // Assuming `id` is mapped correctly in your schema's `toJSON` method.
  }
  
  

  async findById(id: Types.ObjectId): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }
  
  async viewHistory(username: string){
    const user = await this.findIdByUsername(username);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const res = await this.gameService.getGamesByUserId(user._id.toString());
    return res;
  }
}
