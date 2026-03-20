import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycDocType } from '@prisma/client';

// Custom validator for document number based on type
@ValidatorConstraint({ async: false })
export class IsValidDocNumber implements ValidatorConstraintInterface {
  validate(docNumber: string, args: ValidationArguments) {
    const docType = (args.object as any).docType;
    
    if (!docType || !docNumber) {
      return false;
    }

    switch (docType) {
      case 'AADHAAR':
        return /^[2-9][0-9]{11}$/.test(docNumber);
      case 'PAN':
        return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(docNumber);
      case 'PASSPORT':
        return /^[A-Z0-9]{8,9}$/i.test(docNumber);
      case 'DRIVING_LICENSE':
        return /^[A-Z]{2}[0-9]{13,15}$/i.test(docNumber);
      default:
        return docNumber.length >= 4 && docNumber.length <= 20;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const docType = (args.object as any).docType;
    
    switch (docType) {
      case 'AADHAAR':
        return 'Aadhaar must be 12 digits starting with 2-9';
      case 'PAN':
        return 'PAN must be 10 characters (5 uppercase, 4 digits, 1 uppercase)';
      case 'PASSPORT':
        return 'Passport must be 8-9 alphanumeric characters';
      case 'DRIVING_LICENSE':
        return 'Invalid driving license format';
      default:
        return 'Invalid document number format';
    }
  }
}

export function IsValidDocumentNumber(validationOptions?: any) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDocNumber,
    });
  };
}

export class CreateKycDto {
  @ApiProperty({ enum: KycDocType, description: 'Type of KYC document' })
  @IsNotEmpty({ message: 'Document type is required' })
  @IsEnum(KycDocType, {
    message: `docType must be one of: ${Object.values(KycDocType).join(', ')}`,
  })
  docType: KycDocType;

  @ApiProperty({ 
    description: 'Document number',
    example: '123456789012'
  })
  @IsNotEmpty({ message: 'Document number is required' })
  @IsString({ message: 'Document number must be a string' })
  @MinLength(4)
  @MaxLength(20)
  @IsValidDocumentNumber({ message: 'Invalid document number format for the selected document type' })
  docNumber: string;

  @ApiPropertyOptional({ description: 'Account holder full name (for venue owner)' })
  @IsOptional()
  @IsString()
  accountHolder?: string;

  @ApiPropertyOptional({ description: 'Bank account number (9-18 digits)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9,18}$/, { message: 'Account number must be 9-18 digits' })
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'IFSC code (e.g., SBIN0001234)' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Branch name' })
  @IsOptional()
  @IsString()
  branchName?: string;
}
