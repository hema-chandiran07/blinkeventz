import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycDocType } from '@prisma/client';

/**
 * Document format validators for Indian KYC documents
 * - AADHAAR: 12 digits (e.g., 123456789012)
 * - PAN: 10 characters, uppercase alphanumeric (e.g., ABCDE1234F)
 * - PASSPORT: 8-9 characters alphanumeric (e.g., A1234567)
 * - DRIVING_LICENSE: State-specific format (varies, but typically 15 chars)
 */

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
        // 12 digits, starting with 2-9
        return /^[2-9][0-9]{11}$/.test(docNumber);
      case 'PAN':
        // 10 chars: 5 uppercase, 4 digits, 1 uppercase
        return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(docNumber);
      case 'PASSPORT':
        // 8-9 alphanumeric
        return /^[A-Z0-9]{8,9}$/i.test(docNumber);
      case 'DRIVING_LICENSE':
        // Typically 15 chars: 2 letters + 13 digits
        return /^[A-Z]{2}[0-9]{13,15}$/i.test(docNumber);
      default:
        return docNumber.length >= 4 && docNumber.length <= 20;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const docType = (args.object as any).docType;
    
    switch (docType) {
      case 'AADHAAR':
        return 'Aadhaar number must be 12 digits starting with 2-9 (e.g., 123456789012)';
      case 'PAN':
        return 'PAN must be 10 characters: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g., ABCDE1234F)';
      case 'PASSPORT':
        return 'Passport must be 8-9 alphanumeric characters (e.g., A12345678)';
      case 'DRIVING_LICENSE':
        return 'Invalid driving license format (e.g., AB1234567890123)';
      default:
        return 'Invalid document number format';
    }
  }
}

// Decorator function to apply the custom validator
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

export class SubmitKycDto {
  @ApiProperty({
    enum: KycDocType,
    description: 'Type of KYC document',
    example: 'AADHAAR',
  })
  @IsEnum(KycDocType, {
    message: `docType must be one of: ${Object.values(KycDocType).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Document type is required' })
  docType: KycDocType;

  @ApiProperty({
    description: 'Document number (format depends on docType)',
    examples: {
      aadhaar: { value: '123456789012', summary: '12-digit Aadhaar' },
      pan: { value: 'ABCDE1234F', summary: '10-character PAN' },
      passport: { value: 'A12345678', summary: '8-9 character passport' },
    },
  })
  @IsString({ message: 'Document number must be a string' })
  @IsNotEmpty({ message: 'Document number is required' })
  @MinLength(4, { message: 'Document number must be at least 4 characters' })
  @MaxLength(20, { message: 'Document number must not exceed 20 characters' })
  @IsValidDocumentNumber({ message: 'Invalid document number format for the selected document type' })
  docNumber: string;
}
