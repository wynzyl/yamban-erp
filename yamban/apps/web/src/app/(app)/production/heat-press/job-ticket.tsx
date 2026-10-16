'use client';

import { formatSize, sortSizes, sortSizeStrings } from '@yamban/shared';
import { forwardRef } from 'react';

interface RosterEntry {
  playerName: string;
  jerseyNumber: string | null;
  size: string;
  shortSize: string | null;
}

interface JobTicketProps {
  customerName: string;
  productName: string;
  orderNumber: string;
  quantity: number;
  sizes: { size: string; quantity: number }[];
  roster: RosterEntry[];
  designImageUrl?: string | null;
  notes?: string | null;
}

export const JobTicket = forwardRef<HTMLDivElement, JobTicketProps>(
  ({ customerName, productName, orderNumber, quantity, sizes, roster, designImageUrl, notes }, ref) => {
    return (
      <div ref={ref} className="hidden print:block">
        <div className="border-2 border-black p-4 font-mono text-sm" style={{ width: '300px' }}>
          <div className="mb-2 text-lg font-bold">{customerName}</div>
          <div className="mb-3 text-base">{productName}</div>

          {/* Design Image */}
          {designImageUrl && (
            <div className="mb-3">
              <img
                src={designImageUrl}
                alt="Design"
                className="h-auto w-full border border-black/30"
              />
            </div>
          )}

          {/* Size breakdown */}
          {sizes.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {sortSizes(sizes).map((s) => (
                <span key={s.size} className="font-medium">
                  {formatSize(s.size)}:{s.quantity}
                </span>
              ))}
            </div>
          ) : (
            <div className="mb-2">Qty: {quantity}</div>
          )}

          {/* Roster by size */}
          {roster.length > 0 && (
            <div className="mb-2 border-t border-black pt-2">
              {(() => {
                // Get unique sizes from roster entries (handles ONE_SIZE mismatch), sorted
                const rosterSizes = sortSizeStrings([...new Set(roster.map((r) => r.size))]);
                return rosterSizes.map((size) => {
                  const playersInSize = roster.filter((r) => r.size === size);
                  return (
                    <div key={size} className="mb-1">
                      <div className="font-bold">{formatSize(size)}</div>
                      {playersInSize.map((r, idx) => (
                        <div key={idx} className="pl-2">
                          {r.jerseyNumber && `#${r.jerseyNumber} `}
                          {r.playerName}
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div className="mb-2 border-t border-black pt-2 text-xs">
              <div className="font-bold">Notes:</div>
              <div>{notes}</div>
            </div>
          )}

          <div className="border-t border-black pt-2 text-base font-bold">
            Total: {quantity} pcs
          </div>

          <div className="mt-2 text-xs text-black/60">
            Order: {orderNumber}
          </div>
        </div>
      </div>
    );
  },
);

JobTicket.displayName = 'JobTicket';
