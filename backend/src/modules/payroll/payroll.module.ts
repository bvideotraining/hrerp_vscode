import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { SalaryConfigModule } from '@modules/salary-config/salary-config.module';
import { SalaryIncreasesModule } from '@modules/salary-increases/salary-increases.module';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollDataSourceService } from './services/payroll-data-source.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';

@Module({
  imports: [FirebaseModule, AuthModule, SalaryConfigModule, SalaryIncreasesModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollDataSourceService, PayrollCalculationService],
  exports: [PayrollService],
})
export class PayrollModule {}
