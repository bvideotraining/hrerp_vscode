import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MedicalInsuranceController } from './medical-insurance.controller';
import { MedicalInsuranceService } from './medical-insurance.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [MedicalInsuranceController],
  providers: [MedicalInsuranceService],
  exports: [MedicalInsuranceService],
})
export class MedicalInsuranceModule {}
