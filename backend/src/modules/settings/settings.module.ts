import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ScopeModule } from '@modules/common/scope.module';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [FirebaseModule, AuthModule, ScopeModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
