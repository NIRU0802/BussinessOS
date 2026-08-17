import PDFDocument from 'pdfkit';

interface InvoicePdfInput {
  invoiceId: string;
  tenantName: string;
  planName: string;
  amount: number;
  currency: string;
  issuedAt: Date;
  items: { description: string; amount: number }[];
}

/**
 * Renders an invoice PDF in-memory and returns the buffer.
 * No filesystem writes — buffer is handed directly to MinIO upload.
 */
export function generateInvoicePdfBuffer(
  input: InvoicePdfInput,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Business OS — Invoice', { align: 'left' });
    doc.moveDown();
    doc.fontSize(10).text(`Invoice ID: ${input.invoiceId}`);
    doc.text(`Billed to: ${input.tenantName}`);
    doc.text(`Plan: ${input.planName}`);
    doc.text(`Issued: ${input.issuedAt.toISOString().split('T')[0]}`);
    doc.moveDown();

    doc.fontSize(12).text('Line items', { underline: true });
    doc.moveDown(0.5);

    for (const item of input.items) {
      doc
        .fontSize(10)
        .text(item.description, { continued: true, width: 350 })
        .text(`${input.currency} ${item.amount.toFixed(2)}`, {
          align: 'right',
        });
    }

    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Total: ${input.currency} ${input.amount.toFixed(2)}`, {
        align: 'right',
      });

    doc.end();
  });
}
