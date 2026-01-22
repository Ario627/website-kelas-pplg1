import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CloudinaryService } from "./cloudinary.service";
import { CloudinaryProvider } from "./cloudinary.proVider";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule { }
