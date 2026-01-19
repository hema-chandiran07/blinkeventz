import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { ApiBody } from '@nestjs/swagger';

@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  // Upload KYC document
  
@Post('upload')
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      docType: {
        type: 'string',
        enum: ['AADHAR', 'PAN', 'PASSPORT'],
      },
      docNumber: {
        type: 'string',
      },
      file: {
        type: 'string',
        format: 'binary',
      },
    },
    required: ['docType', 'docNumber', 'file'],
  },
})
@UseInterceptors(FileInterceptor('file'))
async uploadKyc(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: SubmitKycDto,
  @Req() req,
) {
  return this.kycService.submitKycWithFile(req.user.id, dto, file);
}
  @Get('me')
  getMyKyc() {
    return this.kycService.getMyKyc(1);
  }
}
