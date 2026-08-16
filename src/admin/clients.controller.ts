import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from './basic-auth.guard';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Controller('api/admin/clients')
@UseGuards(BasicAuthGuard)
export class ClientsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listClients();
  }

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.admin.createClient(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.admin.updateClient(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.admin.deleteClient(id);
  }
}
