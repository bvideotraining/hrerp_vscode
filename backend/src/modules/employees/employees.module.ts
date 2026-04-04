import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { ScopeModule } from '@modules/common/scope.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [FirebaseModule, AuthModule, ScopeModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, JwtAuthGuard],
  exports: [EmployeesService],
})
export class EmployeesModule {}
