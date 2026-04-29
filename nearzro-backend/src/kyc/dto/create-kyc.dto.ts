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

// Lenient document number validator - accepts common real-world formats
@ValidatorConstraint({ async: false })
export class IsValidDocNumber implements ValidatorConstraintInterface {
  validate(docNumber: string, args: ValidationArguments) {
    const docType = (args.object as any).docType;

    if (!docType || !docNumber) {
      return false;
    }

    // Accept any reasonable input (4-20 characters, alphanumeric)
    const isValid = /^[a-zA-Z0-9\s\-\/.]{4,20}$/.test(docNumber);
    
    // Additional warnings for specific types but still accept valid input
    if (docType === 'PAN') {
      // Standard PAN: 5 uppercase + 4 digits + 1 uppercase, but also accept lowercase
      return /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(docNumber);
    } else if (docType === 'AADHAAR') {
      // Accept 12 digits with optional spaces/dashes
      return /^[0-9\s\-]{12,16}$/.test(docNumber.replace(/\s/g, '').replace(/-/g, ''));
    } else if (docType === 'PASSPORT') {
      // Accept 6-12 alphanumeric
      return /^[a-zA-Z0-9]{6,12}$/.test(docNumber);
    } else if (docType === 'DRIVING_LICENSE') {
      // Accept 8-20 alphanumeric
      return /^[a-zA-Z0-9]{8,20}$/.test(docNumber);
    }

    return isValid;
  }

  defaultMessage(args: ValidationArguments) {
    const docType = (args.object as any).docType;

    switch (docType) {
      case 'AADHAAR':
        return 'Aadhaar must be 12 digits';
      case 'PAN':
        return 'PAN must be 10 characters (e.g., ABCDE1234F)';
      case 'PASSPORT':
        return 'Passport must be 6-12 alphanumeric characters';
      case 'DRIVING_LICENSE':
        return 'Driving license must be 8-20 characters';
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
    example: 'ABCDE1234F'
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

  @ApiPropertyOptional({ description: 'Bank account number' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'bankAccountNumber must not exceed 20 characters' })
  @Matches(/^[0-9\s\-]{8,18}$/, { message: 'Account number must be 8-18 digits' })
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'IFSC code (e.g., SBIN0001234)' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, { message: 'Invalid IFSC code format (e.g., SBIN0001234)' })
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
