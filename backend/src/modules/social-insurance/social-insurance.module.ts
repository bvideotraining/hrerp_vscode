import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { SocialInsuranceController } from './social-insurance.controller';
import { SocialInsuranceService } from './social-insurance.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [SocialInsuranceController],
  providers: [SocialInsuranceService],
  exports: [SocialInsuranceService],
})
export class SocialInsuranceModule {}
