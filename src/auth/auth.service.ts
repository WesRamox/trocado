import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { UsersService, type PublicUser } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

export interface JwtPayload {
  sub: number;
  email: string;
}

const SALT_ROUNDS = 10;
// Hash usado quando o usuário não existe, para que o tempo de resposta
// não revele se o email está cadastrado.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register({ name, email, password }: RegisterDto): Promise<PublicUser> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    try {
      return await this.usersService.create({ name, email, password: hashedPassword });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email já cadastrado');
      }
      throw error;
    }
  }

  async signIn({ email, password }: LoginDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(email);
    const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
