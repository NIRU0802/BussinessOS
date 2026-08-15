import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';
import { BranchIdQueryDto } from '../tables/dto/branch-id-query.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @RequirePermissions('reservations.read')
  list(@Query() query: ListReservationsQueryDto) {
    return this.reservationsService.list(query);
  }

  @Post()
  @RequirePermissions('reservations.write')
  create(@Query() query: BranchIdQueryDto, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(query.branchId, dto);
  }

  @Get(':id')
  @RequirePermissions('reservations.read')
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('reservations.write')
  update(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservationsService.update(id, dto);
  }
}
