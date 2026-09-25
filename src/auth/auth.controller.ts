import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { AuthService, type JwtPayload } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() dto: LoginDto) {
    return this.authService.signIn(dto);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    const profile = await this.usersService.findById(user.sub);
    if (!profile) {
      throw new NotFoundException();
    }
    return profile;
  }
}
