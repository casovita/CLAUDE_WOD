import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
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

/** If the service silently refreshed the token, surface it so the client can update localStorage. */
function setRefreshedToken(res: Response, newAccessToken?: string) {
  if (newAccessToken) {
    res.setHeader('X-New-Access-Token', newAccessToken);
    res.setHeader('Access-Control-Expose-Headers', 'X-New-Access-Token');
  }
}

@ApiTags('gmail')
@ApiBearerAuth()
@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('exports')
  @ApiOperation({ summary: 'List SugarWOD export emails in Gmail' })
  async listExports(@Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken } = extractTokens(req);
    const result = await this.gmailService.listExports(accessToken, refreshToken);
    setRefreshedToken(res, result.newAccessToken);
    res.json(result.data);
  }

  @Get('exports/:messageId')
  @ApiOperation({ summary: 'Fetch and parse a SugarWOD export email by message ID' })
  async fetchExport(
    @Param('messageId') messageId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { accessToken, refreshToken } = extractTokens(req);
    const result = await this.gmailService.fetchExport(messageId, accessToken, refreshToken);
    setRefreshedToken(res, result.newAccessToken);
    res.json(result.data);
  }
}
