import { NotFoundException } from '@nestjs/common';
import type { UsersService } from '../users/users.service.js';
import type { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  const usersService = { findById: vi.fn() };
  const controller = new AuthController(
    {} as AuthService,
    usersService as unknown as UsersService,
  );

  it('profile retorna o usuário autenticado', async () => {
    const user = { id: 1, name: 'Ana', email: 'ana@x.com' };
    usersService.findById.mockResolvedValue(user);

    await expect(controller.getProfile({ sub: 1, email: 'ana@x.com' })).resolves.toEqual(user);
    expect(usersService.findById).toHaveBeenCalledWith(1);
  });

  it('profile lança 404 se o usuário não existe mais', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      controller.getProfile({ sub: 99, email: 'x@x.com' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
