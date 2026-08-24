import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Invoice } from "@/lib/api/billing-api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_CLASS: Record<Invoice["status"], string> = {
  draft: "bg-slate-100 text-slate-600",
  issued: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  void: "bg-slate-100 text-slate-400",
};

interface InvoiceHistoryTableProps {
  invoices: Invoice[] | undefined;
  isLoading: boolean;
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const amountLabel = "Rs " + Number(invoice.amount).toLocaleString("en-IN");
  const description = invoice.items[0] ? invoice.items[0].description : "-";
  const badgeClass = "rounded-full px-2 py-0.5 text-xs font-medium " + STATUS_CLASS[invoice.status];
  const linkClass =
    "text-sm font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700";

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-2.5 text-slate-900">{formatDate(invoice.issuedAt)}</td>
      <td className="py-2.5 text-slate-600">{description}</td>
      <td className="py-2.5 font-medium text-slate-900">{amountLabel}</td>
      <td className="py-2.5">
        <span className={badgeClass}>{invoice.status}</span>
      </td>
      <td className="py-2.5 text-right">
        {invoice.pdfUrl && (
          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Download
          </a>
        )}
        {!invoice.pdfUrl && <span className="text-xs text-slate-300">-</span>}
      </td>
    </tr>
  );
}

export function InvoiceHistoryTable({ invoices, isLoading }: InvoiceHistoryTableProps) {
  const hasInvoices = !isLoading && invoices && invoices.length > 0;
  const isEmpty = !isLoading && (!invoices || invoices.length === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <SkeletonRows count={3} />}
        {isEmpty && (
          <EmptyState
            title="No invoices yet"
            description="Invoices will appear here once they're issued."
          />
        )}
        {hasInvoices && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices!.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
