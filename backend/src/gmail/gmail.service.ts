import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { WorkoutsService } from '../workouts/workouts.service';

export interface ExportSummary {
  messageId: string;
  subject: string;
  date: string;
  snippet: string;
}

@Injectable()
export class GmailService {
  constructor(
    private readonly config: ConfigService,
    private readonly workoutsService: WorkoutsService,
  ) {}

  private createClient(accessToken: string, refreshToken?: string) {
    const auth = new google.auth.OAuth2(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
    );
    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return google.gmail({ version: 'v1', auth });
  }

  async listExports(accessToken: string, refreshToken?: string): Promise<ExportSummary[]> {
    console.log('[GMAIL] listExports token prefix:', accessToken?.slice(0, 20), 'len:', accessToken?.length);
    const gmail = this.createClient(accessToken, refreshToken);
    let response;
    try {
      response = await gmail.users.messages.list({
        userId: 'me',
        q: 'from:sugarwod.com has:attachment',
        maxResults: 20,
      });
    } catch {
      throw new UnauthorizedException('Gmail token is invalid or expired. Please reconnect.');
    }

    const messages = response.data.messages ?? [];
    if (messages.length === 0) return [];

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

    return summaries;
  }

  async fetchExport(messageId: string, accessToken: string, refreshToken?: string) {
    const gmail = this.createClient(accessToken, refreshToken);

    let message;
    try {
      message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
    } catch {
      throw new UnauthorizedException('Gmail token is invalid or expired. Please reconnect.');
    }

    const csvPart = this.findCsvPart(message.data.payload);
    if (!csvPart) {
      throw new NotFoundException('No CSV attachment found in this message.');
    }

    // The part body data may be in the part itself or need a separate attachment fetch
    let b64Data = csvPart.body?.data;
    if (!b64Data && csvPart.body?.attachmentId) {
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: csvPart.body.attachmentId,
      });
      b64Data = attachment.data.data;
    }

    if (!b64Data) {
      throw new NotFoundException('Could not retrieve CSV attachment data.');
    }

    // Gmail uses base64url encoding
    const csvText = Buffer.from(b64Data, 'base64url').toString('utf-8');
    const workouts = this.workoutsService.parseCSV(csvText);
    return { messageId, count: workouts.length, workouts };
  }

  private findCsvPart(
    payload: any,
  ): any | null {
    if (!payload) return null;
    if (
      payload.mimeType === 'text/csv' ||
      (payload.filename as string | undefined)?.endsWith('.csv')
    ) {
      return payload;
    }
    for (const part of payload.parts ?? []) {
      const found = this.findCsvPart(part);
      if (found) return found;
    }
    return null;
  }
}
