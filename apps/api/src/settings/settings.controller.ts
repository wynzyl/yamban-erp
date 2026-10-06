import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  type SetElectricityRateData,
  setElectricityRateSchema,
  type UpdateDefaultLaborRatesData,
  updateDefaultLaborRatesSchema,
} from '@yamban/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { SettingsService } from './settings.service.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('electricity-rate')
  getCurrentRate() {
    return this.settings.getCurrentElectricityRate();
  }

  @Get('electricity-rates')
  listRates() {
    return this.settings.listElectricityRates();
  }

  @Post('electricity-rate')
  @Roles('OWNER')
  setRate(@Body(new ZodValidationPipe(setElectricityRateSchema)) body: SetElectricityRateData) {
    return this.settings.setElectricityRate(body);
  }

  @Get('labor-rates')
  @Roles('OWNER')
  listProductLaborRates() {
    return this.settings.listProductLaborRates();
  }

  @Get('labor-rates/defaults')
  @Roles('OWNER')
  listDefaultLaborRates() {
    return this.settings.listDefaultLaborRates();
  }

  @Patch('labor-rates/defaults')
  @Roles('OWNER')
  updateDefaultLaborRates(
    @Body(new ZodValidationPipe(updateDefaultLaborRatesSchema)) body: UpdateDefaultLaborRatesData,
  ) {
    return this.settings.updateDefaultLaborRates(body);
  }
}
