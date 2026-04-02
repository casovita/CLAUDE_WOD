import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/auth/google/callback',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      // Explicitly set as authorization params so passport-google-oauth20 includes
      // access_type=offline in the redirect URL, ensuring a refresh token is returned.
      authorizationParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      state: false,
    } as any);
  }

  // Skip fetching Google user profile — we only need the tokens
  userProfile(_accessToken: string, done: (err: Error | null, profile?: unknown) => void) {
    done(null, {});
  }

  validate(
    accessToken: string,
    refreshToken: string,
    _profile: unknown,
    done: VerifyCallback,
  ) {
    done(null, { accessToken, refreshToken });
  }
}
