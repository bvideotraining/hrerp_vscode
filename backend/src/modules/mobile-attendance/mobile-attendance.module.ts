import { Module } from '@nestjs/common';
import { MobileAttendanceController } from './mobile-attendance.controller';
import { MobileAttendanceService } from './mobile-attendance.service';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [MobileAttendanceController],
  providers: [MobileAttendanceService, JwtAuthGuard],
  exports: [MobileAttendanceService],
})
export class MobileAttendanceModule {}
