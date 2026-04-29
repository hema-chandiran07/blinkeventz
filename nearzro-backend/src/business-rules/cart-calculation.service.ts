import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CartCalculationService {
  private readonly logger = new Logger(CartCalculationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get platform fee percentage from environment
   * Default: 2% (0.02)
   */
  getPlatformFeeRate(): number {
    const value = this.configService.get<number>('PLATFORM_FEE_PERCENTAGE');
    return value !== undefined ? Number(value) : 0.02;
  }

  /**
   * Get tax rate (GST) from environment
   * Default: 18% (0.18)
   */
  getTaxRate(): number {
    const value = this.configService.get<number>('TAX_PERCENTAGE');
    return value !== undefined ? Number(value) : 0.18;
  }

  /**
   * Get express fee from environment
   * Default: ₹50,000 (50000 in paise)
   */
  getExpressFee(): number {
    const value = this.configService.get<number>('EXPRESS_FEE');
    return value !== undefined ? Number(value) : 50000;
  }

  /**
   * Get minimum order amount from environment (in paise)
   * Default: 0
   */
  getMinOrderAmount(): number {
    const value = this.configService.get<number>('MIN_ORDER_AMOUNT');
    return value !== undefined ? Number(value) : 0;
  }

  /**
   * Calculate platform fee amount based on subtotal
   * Formula: (subtotal + expressFee) * platformFeeRate
   */
  calculatePlatformFee(subtotal: Decimal | number, expressFee: Decimal | number = new Decimal(0)): Decimal {
    const rate = this.getPlatformFeeRate();
    return new Decimal(subtotal).add(expressFee).mul(rate);
  }

  /**
   * Calculate tax amount
   * Formula: (subtotal + platformFee) * taxRate  (expressFee is NOT taxable)
   */
  calculateTax(subtotal: Decimal | number, platformFee: Decimal | number): Decimal {
    const rate = this.getTaxRate();
    return new Decimal(subtotal).add(platformFee).mul(rate);
  }

  /**
   * Calculate total amount
   * Formula: subtotal + expressFee + platformFee + tax
   */
  calculateTotal(
    subtotal: Decimal | number,
    expressFee: Decimal | number,
    platformFee: Decimal | number,
    tax: Decimal | number,
  ): Decimal {
    return new Decimal(subtotal).add(expressFee).add(platformFee).add(tax);
  }

  /**
   * Convenience method: Get all fee settings as object
   */
  getFeeSettings() {
    return {
      platformFeeRate: this.getPlatformFeeRate(),
      taxRate: this.getTaxRate(),
      expressFee: this.getExpressFee(),
      minOrderAmount: this.getMinOrderAmount(),
    };
  }
}
