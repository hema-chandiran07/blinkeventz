import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SubmitKycDto } from './submit-kyc.dto';
import { CreateKycDto } from './create-kyc.dto';
import { UpdateKycStatusDto } from './update-kyc-status.dto';
import { KycDocType, KycStatus } from '@prisma/client';

describe('SubmitKycDto', () => {
  // =====================================================
  // POSITIVE TESTS
  // =====================================================

  describe('Valid inputs', () => {
    it('should accept valid Aadhaar number (12 digits starting with 2-9)', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'AADHAAR',
        docNumber: '223456789012', // Starts with 2
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid PAN number (10 chars)', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'PAN',
        docNumber: 'ABCDE1234F',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid passport number (8 chars)', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'PASSPORT',
        docNumber: 'A12345678',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid passport number (9 chars)', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'PASSPORT',
        docNumber: 'AB1234567',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid driving license format', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'DRIVING_LICENSE',
        docNumber: 'AB1234567890123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // =====================================================
  // NEGATIVE TESTS
  // =====================================================

  describe('Invalid inputs', () => {
    it('should reject Aadhaar starting with 0 or 1', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'AADHAAR',
        docNumber: '023456789012', // Starts with 0
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject Aadhaar with less than 12 digits', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'AADHAAR',
        docNumber: '1234567890', // Only 10 digits
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject Aadhaar with more than 12 digits', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'AADHAAR',
        docNumber: '1234567890123', // 13 digits
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject PAN with lowercase letters', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'PAN',
        docNumber: 'abcde1234f', // Lowercase
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject PAN with less than 10 characters', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'PAN',
        docNumber: 'ABCDE123', // 8 chars
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject passport with special characters', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'PASSPORT',
        docNumber: 'A12-4567', // Has dash
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject empty docType', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: '',
        docNumber: '123456789012',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid docType', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'INVALID',
        docNumber: '123456789012',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject empty docNumber', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'AADHAAR',
        docNumber: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject docNumber less than 4 characters', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'AADHAAR',
        docNumber: '123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject docNumber more than 20 characters', async () => {
      const dto = plainToInstance(SubmitKycDto, {
        docType: 'AADHAAR',
        docNumber: '123456789012345678901', // 21 chars
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('CreateKycDto', () => {
  describe('Valid inputs', () => {
    it('should accept valid Aadhaar with bank details', async () => {
      const dto = plainToInstance(CreateKycDto, {
        docType: 'AADHAAR',
        docNumber: '223456789012', // Starts with 2
        accountHolder: 'John Doe',
        bankAccountNumber: '123456789012',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        branchName: 'Main Branch',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid KYC without bank details', async () => {
      const dto = plainToInstance(CreateKycDto, {
        docType: 'PAN',
        docNumber: 'ABCDE1234F',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Invalid bank details', () => {
    it('should reject invalid IFSC code', async () => {
      const dto = plainToInstance(CreateKycDto, {
        docType: 'AADHAAR',
        docNumber: '123456789012',
        ifscCode: 'INVALID', // Invalid format
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject bank account with letters', async () => {
      const dto = plainToInstance(CreateKycDto, {
        docType: 'AADHAAR',
        docNumber: '123456789012',
        bankAccountNumber: '12345678ABCD', // Has letters
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject bank account less than 9 digits', async () => {
      const dto = plainToInstance(CreateKycDto, {
        docType: 'AADHAAR',
        docNumber: '123456789012',
        bankAccountNumber: '12345678', // Only 8 digits
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('UpdateKycStatusDto', () => {
  describe('Valid inputs', () => {
    it('should accept VERIFIED status', async () => {
      const dto = plainToInstance(UpdateKycStatusDto, {
        status: 'VERIFIED',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept REJECTED status with reason', async () => {
      const dto = plainToInstance(UpdateKycStatusDto, {
        status: 'REJECTED',
        rejectionReason: 'Document is blurry',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept PENDING status', async () => {
      const dto = plainToInstance(UpdateKycStatusDto, {
        status: 'PENDING',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject empty status', async () => {
      const dto = plainToInstance(UpdateKycStatusDto, {
        status: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid status', async () => {
      const dto = plainToInstance(UpdateKycStatusDto, {
        status: 'INVALID',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept rejection reason as optional', async () => {
      const dto = plainToInstance(UpdateKycStatusDto, {
        status: 'VERIFIED',
        rejectionReason: undefined,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
