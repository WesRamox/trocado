import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { BorrowedController } from './borrowed.controller.js';
import { PeopleController } from './people.controller.js';
import { PeopleService } from './people.service.js';

@Module({
  imports: [UsersModule],
  controllers: [PeopleController, BorrowedController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
