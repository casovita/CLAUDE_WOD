import { Module } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';

@Module({
  providers: [WorkoutsService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
