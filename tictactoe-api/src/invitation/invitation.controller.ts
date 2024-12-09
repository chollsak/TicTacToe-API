import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  async create(@Body() createInvitationDto: CreateInvitationDto, @Request() req) {
    const res = await this.invitationService.create(createInvitationDto, req.user.username);
    return {
      message: 'Invitation sending',
      Information: res
    };
  }

  @Get()
  async findAll(@Request() req){
    const res = await this.invitationService.findAll(req.user.username);
    return {
      message: 'All invitations',
      invitations: res
    };
  }

  @Patch(':id/cancle')
  async cancle(@Param('id') id: string){
    const res = await this.invitationService.cancleInvitation(id);
    return {
      message: 'Invitation cancle',
      Information: res
    };
  }

  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Request() req) {
    const res = await this.invitationService.acceptInvitation(id, req.user.username);
    return {
      message: 'Invitation accepted',
      Information: res,

    };
  }
  
}
