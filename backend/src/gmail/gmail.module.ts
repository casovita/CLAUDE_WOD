import { Module } from '@nestjs/common';
import { GmailController } from './gmail.controller';
import { GmailService } from './gmail.service';
import { WorkoutsModule } from '../workouts/workouts.module';

@Module({
  imports: [WorkoutsModule],
  controllers: [GmailController],
  providers: [GmailService],
})
export class GmailModule {}
