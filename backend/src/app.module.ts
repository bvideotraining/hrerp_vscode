import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './config/firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { CmsModule } from './modules/cms/cms.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { BonusesModule } from './modules/bonuses/bonuses.module';
import { SocialInsuranceModule } from './modules/social-insurance/social-insurance.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    FirebaseModule,
    AuthModule,
    EmployeesModule,
    OrganizationModule,
    CmsModule,
    AttendanceModule,
    SettingsModule,
    LeavesModule,
    BonusesModule,
    SocialInsuranceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
