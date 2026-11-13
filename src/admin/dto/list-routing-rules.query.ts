import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ListRoutingRulesQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clientId?: string;
}
