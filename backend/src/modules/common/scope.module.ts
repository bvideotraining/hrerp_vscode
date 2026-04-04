import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { ScopeService } from './scope.service';

@Module({
  imports: [FirebaseModule],
  providers: [ScopeService],
  exports: [ScopeService],
})
export class ScopeModule {}
