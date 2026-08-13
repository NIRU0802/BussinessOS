import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SetBranchTimezoneDto } from './dto/set-branch-timezone.dto';

@Injectable()
export class TimezoneService {
  constructor(private readonly prisma: PrismaService) {}

  private isValidIanaTimezone(tz: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }

  async setBranchTimezone(tenantId: string, dto: SetBranchTimezoneDto) {
    if (!this.isValidIanaTimezone(dto.timezone)) {
      throw new BadRequestException(`Invalid IANA timezone: ${dto.timezone}`);
    }
    return this.prisma.branchTimezoneSetting.upsert({
      where: { branchId: dto.branchId },
      update: { timezone: dto.timezone },
      create: { tenantId, branchId: dto.branchId, timezone: dto.timezone },
    });
  }

  async getBranchTimezone(tenantId: string, branchId: string): Promise<string> {
    const setting = await this.prisma.branchTimezoneSetting.findUnique({
      where: { branchId },
    });
    return setting?.timezone ?? 'UTC';
  }

  async toBranchLocalString(
    tenantId: string,
    branchId: string,
    utcDate: Date,
  ): Promise<string> {
    const timezone = await this.getBranchTimezone(tenantId, branchId);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(utcDate);
  }

  async isWithinOperatingHours(
    tenantId: string,
    branchId: string,
    utcDate: Date,
    openTime: string,
    closeTime: string,
  ): Promise<boolean> {
    const timezone = await this.getBranchTimezone(tenantId, branchId);
    const localTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(utcDate);

    return localTimeStr >= openTime && localTimeStr <= closeTime;
  }
}
