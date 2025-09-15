import { Module } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { DualImageService } from './dual-image.service';

@Module({
  providers: [SpacesService, DualImageService],
  exports: [SpacesService, DualImageService],
})
export class StorageModule {}
