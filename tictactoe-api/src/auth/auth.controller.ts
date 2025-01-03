import { Body, Controller, Post, Request, Res, UseGuards} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from 'src/user/dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Res({passthrough: true}) res) {
    const {accessToken} = await this.authService.login(req.user);
    res.cookie('access_token', accessToken, {httpOnly: true});

    return {
      message: 'Login successful',
      username : req.user.username,
      userId: req.user.userId
    }
  }

}
