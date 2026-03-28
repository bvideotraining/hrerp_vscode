import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { SalaryIncreasesController } from './salary-increases.controller';
import { SalaryIncreasesService } from './salary-increases.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [SalaryIncreasesController],
  providers: [SalaryIncreasesService],
  exports: [SalaryIncreasesService],
})
export class SalaryIncreasesModule {}
