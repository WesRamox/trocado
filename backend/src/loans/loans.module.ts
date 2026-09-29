import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { UsersModule } from '../users/users.module.js';
import { LoansController } from './loans.controller.js';
import { LoansService } from './loans.service.js';

@Module({
  imports: [CategoriesModule, UsersModule],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
