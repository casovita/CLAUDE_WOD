import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

interface GoogleUser {
  accessToken: string;
  refreshToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly config: ConfigService) {}

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth2 flow (Gmail read access)' })
  @UseGuards(AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  googleLogin(@Req() _req: Request) {
    // Passport redirects to Google — no body needed
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'OAuth2 callback — redirects to frontend with tokens' })
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as GoogleUser;
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const params = new URLSearchParams({
      access_token: user.accessToken,
      refresh_token: user.refreshToken ?? '',
    });
    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  }
}
