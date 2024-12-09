import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types} from 'mongoose';
import { Invitation, InvitationDocument } from './schemas/invitation.schema';
import { GameService } from 'src/game/game.service';
import { InvitationStatus } from './schemas/invitation-status.schema';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/user.service';


@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(Invitation.name) private readonly invitationModel: Model<InvitationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly userService: UserService,
    private readonly gameService: GameService,
  ) {}

  async create(createInvitationDto: CreateInvitationDto, username: string): Promise<Invitation> {
    const sender = await this.userService.findIdByUsername(username);
    if (!sender) {
      throw new BadRequestException('Sender user not found');
    }
    if (sender._id.toString() === createInvitationDto.receiver) {
      throw new BadRequestException('Cannot invite yourself');
    }
    const newInvitation = new this.invitationModel({
      ...createInvitationDto,
      sender: sender._id,
      status: InvitationStatus.PENDING,
    });
    return newInvitation.save();
  }


  async cancleInvitation(invitationId: string): Promise<Invitation> {
    const invitation = await this.invitationModel.findById(invitationId).exec();
    if (!invitation) {
      throw new Error('Invitation not found');
    }
    if (invitation.status !== 'Pending') {
      throw new Error('Invitation is not pending');
    }
    invitation.status = InvitationStatus.CANCELLED;
    return invitation.save();
  }


  async acceptInvitation(invitationId: string, username: string): Promise<{
    invitationId: string;
    sender: { id: string; username: string };
    receiver: { id: string; username: string };
    status: string;
    gameId: string;
    createdAt: Date;
  }> {

    const invitation = await this.invitationModel.findById(invitationId).exec();
    if (!invitation) {
      throw new BadRequestException('Invitation not found');
    }

    if (invitation.status !== 'Pending') {
      throw new BadRequestException('Invitation is not pending');
    }

    const receiver = await this.userModel.findById(invitation.receiver).exec();
    if (!receiver || receiver.username !== username) {
      throw new BadRequestException('Only the receiver can accept the invitation');
    }

    const sender = await this.userModel.findById(invitation.sender).exec();
    if (!sender) {
      throw new BadRequestException('Sender user not found');
    }  

    const newGame = await this.gameService.createGame({
      player1: invitation.sender,
      player2: invitation.receiver,
      startedAt: new Date(),
    });

    invitation.status = 'Accepted';
    invitation.gameId = newGame._id;

    await invitation.save();
    const datenow = new Date();
    
    return {
      gameId: `This is your game room id: ${newGame._id.toString()}`,
      invitationId: invitation._id.toString(),
      sender: {
        id: sender._id.toString(),
        username: sender.username,
      },
      receiver: {
        id: receiver._id.toString(),
        username: receiver.username,
      },
      status: invitation.status,
      createdAt: datenow,
    };
  }
  
  
  async findAll(username: string) {
    const user = await this.userService.findIdByUsername(username);
    console.log('User ID:', user._id, 'Type:', typeof user._id);
    
    return this.invitationModel.find({ receiver: user._id.toString() }).exec();
  }
  
  
  
  

}
