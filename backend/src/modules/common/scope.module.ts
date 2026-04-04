import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { ScopeService } from './scope.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [FirebaseModule],
  providers: [ScopeService, NotificationsService],
  exports: [ScopeService, NotificationsService],
})
export class ScopeModule {}
