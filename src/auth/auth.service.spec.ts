import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Prisma } from '../generated/prisma/client.js';
import type { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    usersService = { findByEmail: vi.fn(), findById: vi.fn(), create: vi.fn() };
    jwtService = new JwtService({ secret: 'test-secret' });
    service = new AuthService(usersService as unknown as UsersService, jwtService);
  });

  describe('register', () => {
    it('salva a senha com hash, nunca em texto puro', async () => {
      usersService.create.mockImplementation(async ({ password: _password, ...rest }) => ({ id: 1, ...rest }));

      const user = await service.register({ name: 'Ana', email: 'ana@x.com', password: 'senha-forte' });

      const saved = usersService.create.mock.calls[0][0];
      expect(saved.password).not.toBe('senha-forte');
      expect(await bcrypt.compare('senha-forte', saved.password)).toBe(true);
      expect(user).not.toHaveProperty('password');
    });

    it('lança ConflictException quando o email já existe', async () => {
      usersService.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
      );

      await expect(
        service.register({ name: 'Ana', email: 'ana@x.com', password: 'senha-forte' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('signIn', () => {
    const password = 'senha-forte';
    let storedUser: { id: number; email: string; password: string };

    beforeAll(async () => {
      storedUser = { id: 7, email: 'ana@x.com', password: await bcrypt.hash(password, 4) };
    });

    it('retorna um JWT válido com sub e email', async () => {
      usersService.findByEmail.mockResolvedValue(storedUser);

      const { access_token } = await service.signIn({ email: storedUser.email, password });

      const payload = await jwtService.verifyAsync(access_token);
      expect(payload).toMatchObject({ sub: 7, email: 'ana@x.com' });
    });

    it('rejeita senha incorreta', async () => {
      usersService.findByEmail.mockResolvedValue(storedUser);

      await expect(
        service.signIn({ email: storedUser.email, password: 'errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita usuário inexistente', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.signIn({ email: 'ninguem@x.com', password }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
