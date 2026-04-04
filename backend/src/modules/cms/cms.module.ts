import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { PixabayService } from './services/pixabay.service';
import { PixabayCompressionService } from './services/pixabay-compression.service';
import { FirebasePixabayStorageService } from './services/firebase-pixabay-storage.service';

@Module({
  imports: [
    FirebaseModule,
    AuthModule,
    HttpModule,
    ConfigModule,
  ],
  controllers: [CmsController],
  providers: [
    CmsService,
    JwtAuthGuard,
    PixabayService,
    PixabayCompressionService,
    FirebasePixabayStorageService,
  ],
  exports: [CmsService, PixabayService],
})
export class CmsModule {}
