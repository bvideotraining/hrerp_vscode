import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { SalaryConfigController } from './salary-config.controller';
import { SalaryConfigService } from './salary-config.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [SalaryConfigController],
  providers: [SalaryConfigService],
  exports: [SalaryConfigService],
})
export class SalaryConfigModule {}
