import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET não definido no ambiente');
        }
        return {
          secret,
          signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as JwtSignOptions['expiresIn'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Todas as rotas exigem JWT por padrão; use @Public() para liberar.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
