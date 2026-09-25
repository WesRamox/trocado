import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard.js';

describe('AuthGuard', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });
  let reflector: Reflector;
  let guard: AuthGuard;

  const contextWith = (authorization?: string) => {
    const request: Record<string, unknown> = { headers: { authorization } };
    const context = {
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AuthGuard(jwtService, reflector);
  });

  it('libera rotas marcadas com @Public()', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    await expect(guard.canActivate(contextWith().context)).resolves.toBe(true);
  });

  it('rejeita requisição sem token', async () => {
    await expect(guard.canActivate(contextWith().context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejeita token inválido', async () => {
    await expect(
      guard.canActivate(contextWith('Bearer token-invalido').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('aceita token válido e anexa o payload em request.user', async () => {
    const token = await jwtService.signAsync({ sub: 1, email: 'ana@x.com' });
    const { context, request } = contextWith(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: 1, email: 'ana@x.com' });
  });
});
