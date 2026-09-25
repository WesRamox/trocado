import type { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const prisma = { user: { findUnique: vi.fn(), create: vi.fn() } };
  const service = new UsersService(prisma as unknown as PrismaService);

  it('findById não retorna a senha', async () => {
    await service.findById(1);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      omit: { password: true },
    });
  });

  it('create não retorna a senha', async () => {
    const data = { name: 'Ana', email: 'ana@x.com', password: 'hash' };
    await service.create(data);
    expect(prisma.user.create).toHaveBeenCalledWith({ data, omit: { password: true } });
  });
});
