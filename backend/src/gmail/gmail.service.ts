import { Injectable, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { WorkoutsService } from '../workouts/workouts.service';

export interface ExportSummary {
  messageId: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface GmailResult<T> {
  data: T;
  /** New access token if the old one was silently refreshed, otherwise undefined */
  newAccessToken?: string;
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly workoutsService: WorkoutsService,
  ) {}

  private createOAuth2Client(accessToken: string, refreshToken?: string) {
    const auth = new google.auth.OAuth2(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
    );
    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return auth;
  }

  /** Attempt to refresh the access token using the refresh token. */
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const auth = this.createOAuth2Client('', refreshToken);
    const { credentials } = await auth.refreshAccessToken();
    if (!credentials.access_token) {
      throw new UnauthorizedException('Failed to refresh Gmail access token. Please reconnect.');
    }
    this.logger.log('Access token refreshed successfully');
    return credentials.access_token;
  }

  async listExports(accessToken: string, refreshToken?: string): Promise<GmailResult<ExportSummary[]>> {
    let currentToken = accessToken;
    let newAccessToken: string | undefined;

    const tryList = async (token: string) => {
      const auth = this.createOAuth2Client(token, refreshToken);
      const gmail = google.gmail({ version: 'v1', auth });
      return gmail.users.messages.list({
        userId: 'me',
        q: 'from:sugarwod.com has:attachment',
        maxResults: 20,
      });
    };

    let response;
    try {
      response = await tryList(currentToken);
    } catch (err: any) {
      const status = err?.code ?? err?.status ?? err?.response?.status;

      // Try silent token refresh when we have a refresh token
      if ((status === 401 || status === 403) && refreshToken) {
        this.logger.warn('Access token expired — attempting refresh');
        try {
          currentToken = await this.refreshAccessToken(refreshToken);
          newAccessToken = currentToken;
          response = await tryList(currentToken);
        } catch (refreshErr: any) {
          this.logger.error(`Token refresh failed: ${refreshErr?.message}`);
          throw new UnauthorizedException('Gmail token is invalid or expired. Please reconnect.');
        }
      } else {
        this.logger.error(`Gmail API error: ${err?.message} code: ${status}`, err?.stack);
        throw new UnauthorizedException('Gmail token is invalid or expired. Please reconnect.');
      }
    }

    const messages = response.data.messages ?? [];
    if (messages.length === 0) return { data: [], newAccessToken };

    const auth = this.createOAuth2Client(currentToken, refreshToken);
    const gmail = google.gmail({ version: 'v1', auth });

    const summaries = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'Date'],
        });
        const headers = detail.data.payload?.headers ?? [];
        const subject = headers.find((h) => h.name === 'Subject')?.value ?? 'SugarWOD Export';
        const date = headers.find((h) => h.name === 'Date')?.value ?? '';
        return {
          messageId: msg.id!,
          subject,
          date,
          snippet: detail.data.snippet ?? '',
        };
      }),
    );

    return { data: summaries, newAccessToken };
  }

  async fetchExport(messageId: string, accessToken: string, refreshToken?: string): Promise<GmailResult<{ messageId: string; count: number; workouts: unknown[] }>> {
    let currentToken = accessToken;
    let newAccessToken: string | undefined;

    const tryFetch = async (token: string) => {
      const auth = this.createOAuth2Client(token, refreshToken);
      const gmail = google.gmail({ version: 'v1', auth });
      return { gmail, message: await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' }) };
    };

    let gmail: ReturnType<typeof google.gmail>;
    let message: Awaited<ReturnType<typeof google.gmail.prototype.users.messages.get>>;

    try {
      ({ gmail, message } = await tryFetch(currentToken));
    } catch (err: any) {
      const status = err?.code ?? err?.status ?? err?.response?.status;
      if ((status === 401 || status === 403) && refreshToken) {
        this.logger.warn('Access token expired during fetchExport — attempting refresh');
        try {
          currentToken = await this.refreshAccessToken(refreshToken);
          newAccessToken = currentToken;
          ({ gmail, message } = await tryFetch(currentToken));
        } catch {
          throw new UnauthorizedException('Gmail token is invalid or expired. Please reconnect.');
        }
      } else {
        this.logger.error(`Gmail API error (fetchExport): ${err?.message} code: ${status}`, err?.stack);
        throw new UnauthorizedException('Gmail token is invalid or expired. Please reconnect.');
      }
    }

    const csvPart = this.findCsvPart(message.data.payload);
    if (!csvPart) throw new NotFoundException('No CSV attachment found in this message.');

    let b64Data = csvPart.body?.data;
    if (!b64Data && csvPart.body?.attachmentId) {
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: csvPart.body.attachmentId,
      });
      b64Data = attachment.data.data;
    }

    if (!b64Data) throw new NotFoundException('Could not retrieve CSV attachment data.');

    const csvText = Buffer.from(b64Data, 'base64url').toString('utf-8');
    const workouts = this.workoutsService.parseCSV(csvText);
    return { data: { messageId, count: workouts.length, workouts }, newAccessToken };
  }

  private findCsvPart(payload: any): any | null {
    if (!payload) return null;
    if (payload.mimeType === 'text/csv' || (payload.filename as string | undefined)?.endsWith('.csv')) {
      return payload;
    }
    for (const part of payload.parts ?? []) {
      const found = this.findCsvPart(part);
      if (found) return found;
    }
    return null;
  }
}
