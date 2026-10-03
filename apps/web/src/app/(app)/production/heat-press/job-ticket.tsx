'use client';

import { forwardRef } from 'react';

interface JobTicketProps {
  customerName: string;
  productName: string;
  orderNumber: string;
  quantity: number;
  sizes: { size: string; quantity: number }[];
}

export const JobTicket = forwardRef<HTMLDivElement, JobTicketProps>(
  ({ customerName, productName, orderNumber, quantity, sizes }, ref) => {
    return (
      <div ref={ref} className="hidden print:block">
        <div className="border-2 border-black p-4 font-mono text-sm" style={{ width: '300px' }}>
          <div className="mb-2 text-lg font-bold">{customerName}</div>
          <div className="mb-3 text-base">{productName}</div>

          {/* Size breakdown */}
          {sizes.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <span key={s.size} className="font-medium">
                  {s.size}:{s.quantity}
                </span>
              ))}
            </div>
          ) : (
            <div className="mb-2">Qty: {quantity}</div>
          )}

          <div className="border-t border-black pt-2 text-base font-bold">
            Total: {quantity} pcs
          </div>

          <div className="mt-2 text-xs text-gray-600">
            Order: {orderNumber}
          </div>
        </div>
      </div>
    );
  },
);

JobTicket.displayName = 'JobTicket';
