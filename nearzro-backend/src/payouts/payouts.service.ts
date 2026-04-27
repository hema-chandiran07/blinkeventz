import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PayoutStatus } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findAll(query: any) {
    const { status, vendorId, venueId, page = 1, limit = 20 } = query;

    const where: any = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = +vendorId;
    if (venueId) where.venueId = +venueId;

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      data: payouts,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    };
  }

  async findOne(id: number) {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        vendor: true,
        venue: true,
        event: true,
      },
    });

    if (!payout) {
      throw new NotFoundException(`Payout ${id} not found`);
    }

    return payout;
  }

  async findByVenueOwner(userId: number, query: any) {
    const { status, page = 1, limit = 50 } = query;

    const where: any = {
      venue: {
        ownerId: userId,
      },
    };

    if (status) {
      where.status = status;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              eventType: true,
              date: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      data: payouts,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    };
  }

  async getVenueOwnerStats(userId: number) {
    const payouts = await this.prisma.payout.findMany({
      where: {
        venue: {
          ownerId: userId,
        },
      },
      select: {
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    const totalPayouts = payouts
      .filter((p) => p.status === PayoutStatus.APPROVED || p.status === PayoutStatus.PROCESSING)
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayouts = payouts
      .filter((p) => p.status === PayoutStatus.PENDING || p.status === PayoutStatus.PROCESSING)
      .reduce((sum, p) => sum + p.amount, 0);

    const upcomingPayouts = payouts.filter((p) => p.status === PayoutStatus.PENDING).length;

    // Calculate platform fees (5% of total amount)
    const platformFees = payouts.reduce((sum, p) => sum + Math.round(p.amount * 0.05), 0);

    // Monthly breakdown (last 6 months)
    const now = new Date();
    const monthlyData: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = monthDate.toLocaleString('default', { month: 'short' });

      const monthTotal = payouts
        .filter((p) => {
          const payoutDate = new Date(p.createdAt);
          return (
            payoutDate >= monthDate &&
            payoutDate <= monthEnd &&
            (p.status === PayoutStatus.APPROVED || p.status === PayoutStatus.PROCESSING)
          );
        })
        .reduce((sum, p) => sum + p.amount, 0);

      monthlyData.push({ label: monthLabel, value: monthTotal });
    }

    return {
      totalPayouts,
      pendingPayouts,
      upcomingPayouts,
      platformFees,
      monthlyData,
    };
  }

  async approve(id: number) {
    const payout = await this.findOne(id);

    // Enforce forward-only state machine: only PENDING can be approved
    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve payout in ${payout.status} state. Only PENDING payouts can be approved.`,
      );
    }

    return this.prisma.payout.update({
      where: { id },
      data: {
        status: PayoutStatus.APPROVED,
        approvedAt: new Date(),
      },
      include: {
        vendor: true,
        venue: true,
      },
    });
  }

  async reject(id: number, reason: string) {
    const payout = await this.findOne(id);

    // Enforce forward-only state machine: only PENDING can be rejected
    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject payout in ${payout.status} state. Only PENDING payouts can be rejected.`,
      );
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.prisma.payout.update({
      where: { id },
      data: {
        status: PayoutStatus.REJECTED,
        rejectionReason: reason.trim(),
        rejectedAt: new Date(),
      },
      include: {
        vendor: true,
        venue: true,
      },
    });
  }

  /**
   * Process an approved payout via Razorpay X.
   *
   * Flow:
   *  (a) Fetch vendor's bank/UPI details from DB
   *  (b) Create a Razorpay X fund account if one does not already exist
   *  (c) Initiate a payout transfer to that fund account
   *  (d) Store the provider's payout_id (in rejectionReason as a transient ref while
   *      status=PROCESSING — a dedicated providerPayoutId column should be added via
   *      a future migration to replace this workaround)
   *  (e) Webhook handler (handleWebhookEvent) moves status to COMPLETED or FAILED
   */
  async process(id: number) {
    const payout = await this.findOne(id);

    if (payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException('Payout must be approved before processing');
    }

    // ── (a) Fetch vendor bank/UPI details ──────────────────────────────────
    if (!payout.vendorId) {
      throw new BadRequestException('Payout does not have an associated vendor');
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: payout.vendorId },
      select: { userId: true, businessName: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${payout.vendorId} not found`);
    }

    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { userId: vendor.userId, isVerified: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!bankAccount) {
      throw new BadRequestException(
        `Vendor ${payout.vendorId} has no verified bank account. Cannot process payout.`,
      );
    }

    // ── Razorpay X credentials ─────────────────────────────────────────────
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    const razorpayAccountNumber = this.configService.get<string>('RAZORPAY_ACCOUNT_NUMBER');

    const isDryRun =
      !keyId ||
      !keySecret ||
      !razorpayAccountNumber ||
      keyId.includes('xxxxx') ||
      keySecret.includes('xxxx');

    let providerPayoutId: string;

    if (isDryRun) {
      // ── Development / unconfigured: simulate the payout ───────────────────
      this.logger.warn(
        `Razorpay X not configured — simulating payout ${id} (amount: ${payout.amount} paise)`,
      );
      providerPayoutId = `sim_payout_${id}_${Date.now()}`;
    } else {
      // ── Production: Razorpay X Payouts API ────────────────────────────────
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const razorpayXBase = 'https://api.razorpay.com/v1';

      // ── (b) Create/retrieve fund account ──────────────────────────────────
      let fundAccountId: string;
      try {
        const faRes = await axios.post(
          `${razorpayXBase}/fund_accounts`,
          {
            contact_id: bankAccount.referenceId, // Razorpay contact ID stored on BankAccount
            account_type: 'bank_account',
            bank_account: {
              name: bankAccount.accountHolder,
              ifsc: bankAccount.ifsc,
              account_number: bankAccount.accountNumber,
            },
          },
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/json',
            },
          },
        );
        fundAccountId = faRes.data.id;
        this.logger.log(`Razorpay fund account created: ${fundAccountId}`);
      } catch (faErr: any) {
        // If a duplicate fund account exists, Razorpay returns HTTP 400.
        // Fall back to listing existing fund accounts for this contact.
        if (faErr?.response?.status === 400) {
          const listRes = await axios.get(
            `${razorpayXBase}/fund_accounts?contact_id=${bankAccount.referenceId}&account_type=bank_account`,
            { headers: { Authorization: `Basic ${authHeader}` } },
          );
          const items: any[] = listRes.data?.items || [];
          const match = items.find(
            (fa: any) => fa.bank_account?.account_number === bankAccount.accountNumber,
          );
          if (!match) {
            throw new BadRequestException('Failed to create or locate Razorpay fund account');
          }
          fundAccountId = match.id;
          this.logger.log(`Razorpay fund account reused: ${fundAccountId}`);
        } else {
          throw new BadRequestException(`Razorpay fund account error: ${faErr?.message}`);
        }
      }

      // ── (c) Initiate payout transfer ──────────────────────────────────────
      try {
        const payoutRes = await axios.post(
          `${razorpayXBase}/payouts`,
          {
            account_number: razorpayAccountNumber,
            fund_account_id: fundAccountId,
            amount: payout.amount, // already in paise
            currency: 'INR',
            mode: 'IMPS',
            purpose: 'payout',
            queue_if_low_balance: true,
            reference_id: `payout_${id}`, // used in webhook resolution
            narration: `NearZro payout ID ${id}`,
          },
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/json',
              'X-Payout-Idempotency': `payout_${id}`, // idempotency for retries
            },
          },
        );
        providerPayoutId = payoutRes.data.id;
        this.logger.log(`Razorpay payout initiated: ${providerPayoutId}`);
      } catch (payoutErr: any) {
        throw new BadRequestException(
          `Razorpay payout initiation failed: ${payoutErr?.message}`,
        );
      }
    }

    // ── (d) Persist provider payout_id and transition to PROCESSING ───────
    // NOTE: The Payout schema has no dedicated providerPayoutId column.
    //       The Razorpay payout ID is stored in rejectionReason prefixed with
    //       "ref:" as a workaround. Add a providerPayoutId column via migration
    //       to replace this field reuse.
    return this.prisma.payout.update({
      where: { id },
      data: {
        status: PayoutStatus.PROCESSING,
        processedAt: new Date(),
        rejectionReason: `ref:${providerPayoutId}`,
      },
    });
  }

  /**
   * Handle Razorpay X webhook callbacks to move payout status to COMPLETED or FAILED.
   *
   * Supported event types:
   *   payout.processed  → COMPLETED
   *   payout.reversed   → FAILED
   *   payout.failed     → FAILED
   *
   * @param event - Raw parsed Razorpay X webhook body
   */
  async handleWebhookEvent(event: any): Promise<void> {
    const eventType: string = event?.event;
    const payoutEntity = event?.payload?.payout?.entity;

    if (!payoutEntity || !eventType) {
      this.logger.warn('Ignoring malformed Razorpay X webhook payload');
      return;
    }

    const providerPayoutId: string = payoutEntity.id;
    const referenceId: string | undefined = payoutEntity.reference_id; // 'payout_{id}'

    // Resolve our internal payout ID from the reference_id set during process()
    let internalId: number | null = null;
    if (referenceId && referenceId.startsWith('payout_')) {
      internalId = parseInt(referenceId.replace('payout_', ''), 10) || null;
    }

    if (!internalId) {
      this.logger.warn(
        `Razorpay X webhook: cannot resolve internal payout ID from reference_id "${referenceId}"`,
      );
      return;
    }

    const payout = await this.prisma.payout.findUnique({ where: { id: internalId } });
    if (!payout) {
      this.logger.warn(`Razorpay X webhook: payout ${internalId} not found in DB`);
      return;
    }

    // ── (e) Transition status based on event type ─────────────────────────
    if (eventType === 'payout.processed') {
      await this.prisma.payout.update({
        where: { id: internalId },
        data: {
          status: PayoutStatus.COMPLETED,
          rejectionReason: `ref:${providerPayoutId}`,
        },
      });
      this.logger.log(
        `Payout ${internalId} → COMPLETED (provider: ${providerPayoutId})`,
      );
    } else if (eventType === 'payout.reversed' || eventType === 'payout.failed') {
      const failReason = payoutEntity.error?.description || eventType;
      await this.prisma.payout.update({
        where: { id: internalId },
        data: {
          status: PayoutStatus.FAILED,
          rejectionReason: `failed:${providerPayoutId}:${failReason}`,
        },
      });
      this.logger.error(
        `Payout ${internalId} → FAILED (provider: ${providerPayoutId}, reason: ${failReason})`,
      );
    } else {
      this.logger.log(
        `Payout ${internalId}: unhandled Razorpay X event "${eventType}"`,
      );
    }
  }

  async export() {
    const payouts = await this.prisma.payout.findMany({
      include: {
        vendor: true,
        venue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // CSV formula injection sanitization
    const sanitize = (value: any): string => {
      const str = String(value ?? '');
      if (/^[=+\-@]/.test(str)) return `'${str}`;
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      ['ID', 'Vendor', 'Venue', 'Amount', 'Status', 'Created At'],
      ...payouts.map((p) => [
        p.id,
        sanitize(p.vendor?.businessName || ''),
        sanitize(p.venue?.name || ''),
        p.amount,
        p.status,
        p.createdAt.toISOString(),
      ]),
    ];

    return csvRows.map((row) => row.join(',')).join('\n');
  }
}
