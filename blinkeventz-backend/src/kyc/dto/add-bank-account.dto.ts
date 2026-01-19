import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddBankAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountHolder: string;

  @ApiProperty({
    description: 'Bank account number (digits only)',
  })
  @IsString()
  @Length(9, 18)
  @Matches(/^\d+$/, {
    message: 'Account number must contain only digits',
  })
  accountNumber: string;

  @ApiProperty({
    description: 'IFSC code (e.g. SBIN0001234)',
  })
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'Invalid IFSC code format',
  })
  ifsc: string;

  @ApiProperty()
  @IsString()
  bankName: string;

  @ApiProperty()
  @IsString()
  branchName: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isPrimary: boolean;
}
