import { IsBoolean, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddBankAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountHolder: string;

  @ApiProperty()
  @IsString()
  @Length(9, 18)
  accountNumber: string;

  @ApiProperty()
  @IsString()
  @Length(11, 11)
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
