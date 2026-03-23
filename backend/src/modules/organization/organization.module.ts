import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, JwtAuthGuard],
  exports: [OrganizationService],
})
export class OrganizationModule {}
