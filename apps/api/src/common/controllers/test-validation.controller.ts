import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../decorators/public.decorator.js';
import { TestValidationDto } from '../dto/test-validation.dto.js';

@Controller('test-validation')
export class TestValidationController {
  @Public()
  @Post()
  testValidation(@Body() dto: TestValidationDto) {
    return { message: 'Validation passed', data: dto };
  }
}
