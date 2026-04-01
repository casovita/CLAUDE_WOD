import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { GmailService } from './gmail.service';

function extractTokens(req: Request): { accessToken: string; refreshToken?: string } {
  const auth = req.headers['authorization'] ?? '';
  if (!auth.startsWith('Bearer ')) {
    throw new UnauthorizedException('Missing Bearer token');
  }
  const accessToken = auth.slice(7);
  const refreshToken = (req.headers['x-refresh-token'] as string | undefined) ?? undefined;
  return { accessToken, refreshToken };
}

@ApiTags('gmail')
@ApiBearerAuth()
@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('exports')
  @ApiOperation({ summary: 'List SugarWOD export emails in Gmail' })
  listExports(@Req() req: Request) {
    const { accessToken, refreshToken } = extractTokens(req);
    return this.gmailService.listExports(accessToken, refreshToken);
  }

  @Get('exports/:messageId')
  @ApiOperation({ summary: 'Fetch and parse a SugarWOD export email by message ID' })
  fetchExport(@Param('messageId') messageId: string, @Req() req: Request) {
    const { accessToken, refreshToken } = extractTokens(req);
    return this.gmailService.fetchExport(messageId, accessToken, refreshToken);
  }
}
