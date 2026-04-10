import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from './common/logger.config';
import { HttpLoggerMiddleware } from './common/http-logger.middleware';
import { UploadModule } from './upload/upload.module';
import { AuthModule } from './auth/auth.module';
import { GmailModule } from './gmail/gmail.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot(loggerConfig),
    UploadModule,
    AuthModule,
    GmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
