'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useCurrentLocale } from '@/locales/client';
import { propFirms, AccountSize } from './config';
import {
  WidgetBody,
  WidgetCard,
  WidgetHeader,
  formatCount,
  formatCurrency,
  formatPercent,
} from '../widgets';

/** A value the compared account does not define. */
const NO_VALUE = '-';

export function ComparisonTable() {
  const locale = useCurrentLocale();
  const [firstSelection, setFirstSelection] = useState<{
    propFirm: string;
    account: string;
  } | null>(null);
  const [secondSelection, setSecondSelection] = useState<{
    propFirm: string;
    account: string;
  } | null>(null);

  const firstAccount = firstSelection
    ? propFirms[firstSelection.propFirm].accountSizes[firstSelection.account]
    : null;
  const secondAccount = secondSelection
    ? propFirms[secondSelection.propFirm].accountSizes[secondSelection.account]
    : null;

  const renderValue = (value: any) => {
    if (value === null || value === undefined) return NO_VALUE;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (value >= 1000) {
        return formatCurrency(value, locale, { maximumFractionDigits: 0 });
      }
      return formatCount(value, locale);
    }
    return value;
  };

  /*
   * Peer figures share one precision, picked once in the shared formatters
   * rather than re-derived per row with template strings.
   */
  const money = (v: any) =>
    v === null || v === undefined ? NO_VALUE : formatCurrency(Number(v), locale, { maximumFractionDigits: 0 });
  const percent = (v: any) =>
    v === null || v === undefined ? NO_VALUE : formatPercent(Number(v), locale);

  const comparisonFields: {
    label: string;
    key: keyof AccountSize;
    format?: (value: any) => string;
  }[] = [
    { label: 'Account Name', key: 'name' },
    { label: 'Price', key: 'price', format: money },
    { label: 'Price with Promo', key: 'priceWithPromo', format: money },
    { label: 'Target', key: 'target', format: money },
    { label: 'Daily Loss', key: 'dailyLoss', format: money },
    { label: 'Drawdown', key: 'drawdown', format: money },
    { label: 'Min Days', key: 'minDays' },
    { label: 'Consistency', key: 'consistency', format: percent },
    { label: 'Trading News Allowed', key: 'tradingNewsAllowed' },
    { label: 'Profit Sharing', key: 'profitSharing', format: percent },
    { label: 'Min Payout', key: 'minPayout', format: money },
    { label: 'Max Funded Accounts', key: 'maxFundedAccounts' },
  ];

  return (
    <WidgetCard>
      <WidgetHeader title="Prop firm comparison" />
      <WidgetBody className="overflow-auto">
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <Select
              value={firstSelection?.propFirm}
              onValueChange={(value) =>
                setFirstSelection({ propFirm: value, account: '' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select first prop firm" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(propFirms).map(([key, firm]) => (
                  <SelectItem key={key} value={key}>
                    {firm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {firstSelection?.propFirm && (
              <Select
                value={firstSelection?.account}
                onValueChange={(value) =>
                  setFirstSelection((prev) => ({
                    ...prev!,
                    account: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(
                    propFirms[firstSelection.propFirm].accountSizes
                  ).map(([key, account]) => (
                    <SelectItem key={key} value={key}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex-1">
            <Select
              value={secondSelection?.propFirm}
              onValueChange={(value) =>
                setSecondSelection({ propFirm: value, account: '' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select second prop firm" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(propFirms).map(([key, firm]) => (
                  <SelectItem key={key} value={key}>
                    {firm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {secondSelection?.propFirm && (
              <Select
                value={secondSelection?.account}
                onValueChange={(value) =>
                  setSecondSelection((prev) => ({
                    ...prev!,
                    account: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(
                    propFirms[secondSelection.propFirm].accountSizes
                  ).map(([key, account]) => (
                    <SelectItem key={key} value={key}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {(firstAccount || secondAccount) && (
          <Table>
            <TableCaption className="sr-only">
              Feature by feature comparison of the two selected prop firm accounts
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Feature</TableHead>
                {/* Both value columns hold a mix of words and figures, so they
                    are aligned as text and the numbers stay tabular. */}
                <TableHead scope="col">
                  {firstAccount
                    ? `${propFirms[firstSelection!.propFirm].name} - ${
                        firstAccount.name
                      }`
                    : NO_VALUE}
                </TableHead>
                <TableHead scope="col">
                  {secondAccount
                    ? `${propFirms[secondSelection!.propFirm].name} - ${
                        secondAccount.name
                      }`
                    : NO_VALUE}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonFields.map(({ label, key, format }) => (
                <TableRow key={key}>
                  <TableCell scope="row" className="font-medium">{label}</TableCell>
                  <TableCell className={cn('tabular-nums')}>
                    {firstAccount
                      ? format
                        ? format(firstAccount[key])
                        : renderValue(firstAccount[key])
                      : NO_VALUE}
                  </TableCell>
                  <TableCell className={cn('tabular-nums')}>
                    {secondAccount
                      ? format
                        ? format(secondAccount[key])
                        : renderValue(secondAccount[key])
                      : NO_VALUE}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </WidgetBody>
    </WidgetCard>
  );
}
