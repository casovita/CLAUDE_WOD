import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { simpleParser } from 'mailparser';
import { WorkoutsService } from '../workouts/workouts.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a SugarWOD .eml file and parse workouts' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadEml(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let csvText: string;

    const contentType = file.mimetype ?? '';
    const originalName = file.originalname ?? '';

    if (
      contentType === 'text/csv' ||
      originalName.endsWith('.csv')
    ) {
      // Raw CSV uploaded directly
      csvText = file.buffer.toString('utf-8');
    } else {
      // Treat as .eml — parse MIME
      const parsed = await simpleParser(file.buffer);
      const csvAttachment = parsed.attachments.find(
        (a) =>
          a.contentType === 'text/csv' ||
          (a.filename ?? '').endsWith('.csv'),
      );

      if (!csvAttachment) {
        throw new BadRequestException(
          'No CSV attachment found in this email. Make sure you are uploading a SugarWOD export .eml file.',
        );
      }

      csvText = csvAttachment.content.toString('utf-8');
    }

    const workouts = this.workoutsService.parseCSV(csvText);
    return { count: workouts.length, workouts };
  }
}
