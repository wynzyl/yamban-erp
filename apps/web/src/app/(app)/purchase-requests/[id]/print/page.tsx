import {
  formatMeasure,
  formatMoney,
  PURCHASE_REQUEST_STATUS_LABELS,
  type PurchaseRequestStatus,
  type StockUnit,
  UNIT_SUFFIX,
} from '@yamban/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { PrintPageButton } from './print-page-button';

export const metadata: Metadata = { title: 'Print purchase request' };

interface PurchaseRequestLineRow {
  id: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  shortageQuantity: string;
  purchaseQty: string;
  estimatedUnitCost: string;
  estimatedTotal: string;
  linkedOrders: { orderId: string; orderNumber: string; quantity: string }[];
}

interface PurchaseRequestDetail {
  id: string;
  prNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierContactPerson: string | null;
  supplierMobile: string | null;
  supplierEmail: string | null;
  supplierAddress: string | null;
  status: PurchaseRequestStatus;
  neededBy: string | null;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
  lines: PurchaseRequestLineRow[];
}

export default async function PrintPurchaseRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let pr: PurchaseRequestDetail;
  try {
    pr = await apiFetch<PurchaseRequestDetail>(`/purchase-requests/${id}`);
  } catch {
    notFound();
  }

  const estimatedTotal = pr.lines.reduce((sum, line) => sum + parseFloat(line.estimatedTotal), 0);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      {/* Header */}
      <div className="mb-8 border-b-2 border-black pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">PURCHASE REQUEST</h1>
            <p className="mt-1 text-lg font-semibold">{pr.prNumber}</p>
          </div>
          <div className="text-right text-sm">
            <p><strong>Date:</strong> {new Date(pr.createdAt).toLocaleDateString('en-PH')}</p>
            <p><strong>Status:</strong> {PURCHASE_REQUEST_STATUS_LABELS[pr.status]}</p>
            {pr.neededBy && (
              <p><strong>Needed by:</strong> {new Date(pr.neededBy).toLocaleDateString('en-PH')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-600">Supplier</h2>
        {pr.supplierName ? (
          <div className="text-sm">
            <p className="font-semibold">{pr.supplierName}</p>
            {pr.supplierContactPerson && <p>{pr.supplierContactPerson}</p>}
            {pr.supplierMobile && <p>{pr.supplierMobile}</p>}
            {pr.supplierEmail && <p>{pr.supplierEmail}</p>}
            {pr.supplierAddress && <p>{pr.supplierAddress}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No supplier assigned</p>
        )}
      </div>

      {/* Materials Table */}
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-2 text-left font-semibold">Material</th>
            <th className="py-2 text-right font-semibold">Quantity</th>
            <th className="py-2 text-right font-semibold">Unit Cost</th>
            <th className="py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {pr.lines.map((line) => {
            const unitSuffix = UNIT_SUFFIX[line.materialUnit];
            const purchaseUnits = Math.ceil(parseFloat(line.purchaseQty) / parseFloat(line.purchaseQuantity));
            return (
              <tr key={line.id} className="border-b border-gray-300">
                <td className="py-2">
                  {line.materialName}
                  {line.materialColor && <span className="text-gray-600"> ({line.materialColor})</span>}
                </td>
                <td className="py-2 text-right">
                  {purchaseUnits} {line.purchaseUnit}
                  <span className="ml-1 text-gray-500">
                    ({formatMeasure(line.purchaseQty, unitSuffix)})
                  </span>
                </td>
                <td className="py-2 text-right">
                  {formatMoney(parseFloat(line.estimatedUnitCost).toFixed(2))}/{unitSuffix}
                </td>
                <td className="py-2 text-right font-medium">
                  {formatMoney(line.estimatedTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td colSpan={3} className="py-2 text-right font-semibold">Estimated Total:</td>
            <td className="py-2 text-right font-bold">{formatMoney(estimatedTotal.toFixed(2))}</td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {pr.notes && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-600">Notes</h2>
          <p className="whitespace-pre-wrap text-sm">{pr.notes}</p>
        </div>
      )}

      {/* Signature Lines */}
      <div className="mt-12 grid grid-cols-2 gap-8">
        <div>
          <div className="border-b border-black"></div>
          <p className="mt-1 text-center text-sm">Requested by</p>
        </div>
        <div>
          <div className="border-b border-black"></div>
          <p className="mt-1 text-center text-sm">Approved by</p>
        </div>
      </div>

      {/* Print button - hidden when printing */}
      <div className="mt-8 flex justify-center print:hidden">
        <PrintPageButton />
      </div>
    </div>
  );
}
