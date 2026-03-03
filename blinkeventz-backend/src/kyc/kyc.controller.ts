import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiTags,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: number; email: string; role?: string };
}

// ─────────────────────────────────────────────────────────────
// KYC Controller — User-facing endpoints
// ─────────────────────────────────────────────────────────────

@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Submit KYC document with file upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        docType: {
          type: 'string',
          enum: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'],
        },
        docNumber: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['docType', 'docNumber', 'file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadKyc(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubmitKycDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('KYC document file is required');
    }

    return this.kycService.submitKycWithFile(req.user.userId, dto, file);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my KYC documents' })
  async getMyKyc(@Req() req: AuthenticatedRequest) {
    return this.kycService.getMyKyc(req.user.userId);
  }
}
