import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [CmsController],
  providers: [CmsService, JwtAuthGuard],
  exports: [CmsService],
})
export class CmsModule {}
