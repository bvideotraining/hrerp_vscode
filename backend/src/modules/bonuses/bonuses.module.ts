import { Module } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { AuthModule } from '@modules/auth/auth.module';
import { BonusesController } from './bonuses.controller';
import { BonusesService } from './bonuses.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [BonusesController],
  providers: [BonusesService],
  exports: [BonusesService],
})
export class BonusesModule {}
