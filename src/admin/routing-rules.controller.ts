import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from './basic-auth.guard';
import { ListRoutingRulesQueryDto } from './dto/list-routing-rules.query';
import {
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
} from './dto/routing-rule.dto';

@Controller('api/admin/routing-rules')
@UseGuards(BasicAuthGuard)
export class RoutingRulesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list(@Query() query: ListRoutingRulesQueryDto) {
    return this.admin.listRoutingRules(query.clientId);
  }

  @Post()
  create(@Body() dto: CreateRoutingRuleDto) {
    return this.admin.createRoutingRule(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoutingRuleDto) {
    return this.admin.updateRoutingRule(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.admin.deleteRoutingRule(id);
  }
}
