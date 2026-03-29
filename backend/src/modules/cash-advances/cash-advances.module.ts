import { Module } from '@nestjs/common';
import { CashAdvancesController } from './cash-advances.controller';
import { CashAdvancesService } from './cash-advances.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [CashAdvancesController],
  providers: [CashAdvancesService],
  exports: [CashAdvancesService],
})
export class CashAdvancesModule {}
