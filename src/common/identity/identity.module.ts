// identity.module.ts
import { Module } from '@nestjs/common';
import { IdentityService } from './identity';
import { IdentityGuard } from './identity.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [IdentityService, IdentityGuard],
  exports: [IdentityService, IdentityGuard],
})
export class IdentityModule {}