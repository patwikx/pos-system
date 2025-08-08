"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatter } from "@/lib/utils";

interface TopPartnersTableProps {
  data: Array<{
    name: string;
    amount: number;
  }>;
  type: 'customers' | 'vendors';
}

export function TopPartnersTable({ data, type }: TopPartnersTableProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>{type === 'customers' ? 'Customer' : 'Vendor'}</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((partner, index) => (
            <TableRow key={index}>
              <TableCell>
                <Badge variant="outline">#{index + 1}</Badge>
              </TableCell>
              <TableCell className="font-medium">{partner.name}</TableCell>
              <TableCell className="text-right font-mono">
                {formatter.format(partner.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No {type} data available</p>
        </div>
      )}
    </div>
  );
}