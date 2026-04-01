import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { WorkoutsModule } from '../workouts/workouts.module';

@Module({
  imports: [WorkoutsModule],
  controllers: [UploadController],
})
export class UploadModule {}
