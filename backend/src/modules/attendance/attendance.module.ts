import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { OrganizationModule } from '@modules/organization/organization.module';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { ScopeModule } from '@modules/common/scope.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [FirebaseModule, AuthModule, OrganizationModule, ScopeModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, JwtAuthGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}
