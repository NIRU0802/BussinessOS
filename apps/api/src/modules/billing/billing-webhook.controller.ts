import { Controller, Post, Req, Res, HttpCode } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BillingWebhookHandlerService } from './billing-webhook-handler.service';

/**
 * Raw body is required for signature verification. Ensure this route
 * is registered with express.raw() body parsing (bypassing the global
 * JSON body parser) â€” same as your existing webhook module's routes.
 * ADJUST: wire raw-body middleware in main.ts for this exact path if
 * not already handled globally for /webhooks/*.
 */
@Controller('webhooks/billing')
export class BillingWebhookController {
  constructor(private readonly handler: BillingWebhookHandlerService) {}

  @Post()
  @HttpCode(200)
  async receive(@Req() req: Request, @Res() res: Response) {
    const signatureHeader =
      (req.headers['x-razorpay-signature'] as string) ??
      (req.headers['stripe-signature'] as string) ??
      '';

    await this.handler.handleIncomingWebhook(
      req.body as Buffer,
      signatureHeader,
    );
    res.status(200).json({ received: true });
  }
}
