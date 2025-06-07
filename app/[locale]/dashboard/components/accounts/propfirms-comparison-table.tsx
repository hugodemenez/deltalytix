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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { propFirms, AccountSize } from './config';

export function ComparisonTable() {
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
    if (value === null) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (value >= 1000) {
        return `$${value.toLocaleString()}`;
      }
      return value;
    }
    return value;
  };

  const comparisonFields: {
    label: string;
    key: keyof AccountSize;
    format?: (value: any) => string;
  }[] = [
    { label: 'Account Name', key: 'name' },
    { label: 'Price', key: 'price', format: (v) => `$${v}` },
    { label: 'Price with Promo', key: 'priceWithPromo', format: (v) => `$${v}` },
    { label: 'Target', key: 'target', format: (v) => `$${v}` },
    { label: 'Daily Loss', key: 'dailyLoss', format: (v) => v ? `$${v}` : '-' },
    { label: 'Drawdown', key: 'drawdown', format: (v) => `$${v}` },
    { label: 'Min Days', key: 'minDays' },
    { label: 'Consistency', key: 'consistency', format: (v) => v ? `${v}%` : '-' },
    { label: 'Trading News Allowed', key: 'tradingNewsAllowed' },
    { label: 'Profit Sharing', key: 'profitSharing', format: (v) => `${v}%` },
    { label: 'Min Payout', key: 'minPayout', format: (v) => `$${v}` },
    { label: 'Max Funded Accounts', key: 'maxFundedAccounts' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prop Firm Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
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
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>
                  {firstAccount
                    ? `${propFirms[firstSelection!.propFirm].name} - ${
                        firstAccount.name
                      }`
                    : '-'}
                </TableHead>
                <TableHead>
                  {secondAccount
                    ? `${propFirms[secondSelection!.propFirm].name} - ${
                        secondAccount.name
                      }`
                    : '-'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonFields.map(({ label, key, format }) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell>
                    {firstAccount
                      ? format
                        ? format(firstAccount[key])
                        : renderValue(firstAccount[key])
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {secondAccount
                      ? format
                        ? format(secondAccount[key])
                        : renderValue(secondAccount[key])
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 