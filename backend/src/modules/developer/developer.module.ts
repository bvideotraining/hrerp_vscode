import { Module, OnModuleInit } from '@nestjs/common';
import { FirebaseModule } from '@config/firebase/firebase.module';
import { DeveloperService } from './developer.service';
import { DeveloperController } from './developer.controller';
import { AiService } from './ai/ai.service';
import { AiController } from './ai/ai.controller';

@Module({
  imports: [FirebaseModule],
  controllers: [DeveloperController, AiController],
  providers: [DeveloperService, AiService],
  exports: [DeveloperService, AiService],
})
export class DeveloperModule implements OnModuleInit {
  constructor(private developerService: DeveloperService) {}

  async onModuleInit() {
    // Initialize/update platform_resources on startup (upsert — adds missing keys)
    try {
      await this.developerService.initializePlatformResources();
      // Clean up legacy keys from older seed format (VITE_ prefix)
      await this.developerService.cleanupLegacyKeys();
    } catch (error) {
      console.error('Failed to initialize platform resources:', error);
    }
  }
}
