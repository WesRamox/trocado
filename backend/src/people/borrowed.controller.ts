import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { currentMonth } from '../common/date.js';
import { MonthQuery } from '../transactions/dto/list-transactions.query.js';
import { UsersService } from '../users/users.service.js';
import { BorrowedMonthParams, MarkReceivedDto, UnmarkReceivedQuery } from './dto/borrowed.params.js';
import { PeopleService } from './people.service.js';

// Compras que outras pessoas fizeram nos seus cartões e o que cada uma te deve
@Controller('borrowed')
export class BorrowedController {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly usersService: UsersService,
  ) {}

  // GET /borrowed?month=2026-10 -> o que cobrar de cada pessoa pelas faturas que vencem em outubro
  @Get()
  async findAll(@CurrentUser() user: JwtPayload, @Query() { month }: MonthQuery) {
    month ??= currentMonth(await this.usersService.timezoneOf(user.sub));
    return this.peopleService.borrowed(user.sub, month);
  }

  @Put(':personId/:month/received')
  markReceived(
    @CurrentUser() user: JwtPayload,
    @Param() { personId, month }: BorrowedMonthParams,
    @Body() { date, ids }: MarkReceivedDto,
  ) {
    return this.peopleService.markReceived(user.sub, personId, month, date, ids);
  }

  @Delete(':personId/:month/received')
  unmarkReceived(
    @CurrentUser() user: JwtPayload,
    @Param() { personId, month }: BorrowedMonthParams,
    @Query() { ids }: UnmarkReceivedQuery,
  ) {
    return this.peopleService.unmarkReceived(user.sub, personId, month, ids);
  }
}
