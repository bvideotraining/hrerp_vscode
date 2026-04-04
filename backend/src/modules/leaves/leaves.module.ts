import { Module } from '@nestjs/common';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { LeaveBalanceController } from './leave-balance.controller';
import { LeaveBalanceService } from './leave-balance.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ScopeModule } from '../common/scope.module';

@Module({
  imports: [FirebaseModule, AuthModule, AttendanceModule, ScopeModule],
  controllers: [LeavesController, LeaveBalanceController],
  providers: [LeavesService, LeaveBalanceService],
  exports: [LeavesService, LeaveBalanceService],
})
export class LeavesModule {}
