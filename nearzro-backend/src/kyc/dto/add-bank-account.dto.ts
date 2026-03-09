import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddBankAccountDto {
  @ApiProperty({
    description: 'Account holder full name',
    example: 'Rahul Sharma',
  })
  @IsString()
  @IsNotEmpty()
  accountHolder: string;

  @ApiProperty({
    description: 'Bank account number (digits only, 9-18 chars)',
    example: '1234567890123',
  })
  @IsString()
  @Length(9, 18)
  @Matches(/^\d+$/, {
    message: 'Account number must contain only digits',
  })
  accountNumber: string;

  @ApiProperty({
    description: 'IFSC code (e.g., SBIN0001234)',
    example: 'SBIN0001234',
  })
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'Invalid IFSC code format',
  })
  ifsc: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'State Bank of India',
  })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiPropertyOptional({
    description: 'Branch name',
    example: 'Koramangala Branch',
  })
  @IsOptional()
  @IsString()
  branchName?: string;
}
