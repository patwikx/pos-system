"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { Calendar, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import { BankAccountWithDetails } from "@/types/financials-types";
import { formatter } from "@/lib/utils";

interface BankReconciliationClientProps {
  bankAccounts: BankAccountWithDetails[];
}

interface ReconciliationItem {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  isReconciled: boolean;
  journalEntryId?: string;
}

export function BankReconciliationClient({ bankAccounts }: BankReconciliationClientProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [statementBalance, setStatementBalance] = useState<string>('');
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedAccount = bankAccounts.find(acc => acc.id === selectedAccountId);
  const bookBalance = selectedAccount?.glAccount.balance || 0;
  const statementBalanceNum = parseFloat(statementBalance) || 0;
  
  const reconciledItems = reconciliationItems.filter(item => item.isReconciled);
  const unreconciledItems = reconciliationItems.filter(item => !item.isReconciled);
  
  const adjustedBalance = bookBalance + unreconciledItems
    .reduce((sum, item) => sum + (item.type === 'DEPOSIT' ? item.amount : -item.amount), 0);
  
  const difference = Math.abs(adjustedBalance - statementBalanceNum);
  const isReconciled = difference < 0.01;

  const handleItemToggle = (itemId: string) => {
    setReconciliationItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, isReconciled: !item.isReconciled }
          : item
      )
    );
  };

  const loadBankTransactions = async () => {
    if (!selectedAccountId) return;
    
    setLoading(true);
    try {
      // In a real implementation, this would fetch actual bank transactions
      // For now, we'll simulate some data
      const mockItems: ReconciliationItem[] = [
        {
          id: '1',
          date: new Date(),
          description: 'Customer Payment - INV-001',
          amount: 1500,
          type: 'DEPOSIT',
          isReconciled: false,
          journalEntryId: 'je-001'
        },
        {
          id: '2',
          date: new Date(),
          description: 'Vendor Payment - BILL-001',
          amount: 800,
          type: 'WITHDRAWAL',
          isReconciled: false,
          journalEntryId: 'je-002'
        },
        {
          id: '3',
          date: new Date(),
          description: 'Bank Charges',
          amount: 25,
          type: 'WITHDRAWAL',
          isReconciled: false
        }
      ];
      
      setReconciliationItems(mockItems);
    } catch (error) {
      console.error('Error loading bank transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Heading 
        title="Bank Reconciliation" 
        description="Reconcile bank statements with your accounting records" 
      />
      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Setup Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Reconciliation Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {account.bankName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Statement Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
              />
            </div>

            <Button 
              onClick={loadBankTransactions} 
              disabled={!selectedAccountId || loading}
              className="w-full"
            >
              {loading ? 'Loading...' : 'Load Transactions'}
            </Button>
          </CardContent>
        </Card>

        {/* Summary Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Reconciliation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Book Balance</div>
                <div className="text-lg font-bold">{formatter.format(bookBalance)}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Statement Balance</div>
                <div className="text-lg font-bold">{formatter.format(statementBalanceNum)}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Adjusted Balance:</span>
                <span className="font-medium">{formatter.format(adjustedBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Difference:</span>
                <span className={`font-medium ${difference < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatter.format(difference)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center p-3 rounded-lg">
              {isReconciled ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Reconciled</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Not Reconciled</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      {reconciliationItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={reconciliationItems.every(item => item.isReconciled)}
                      onCheckedChange={(checked) => {
                        setReconciliationItems(items => 
                          items.map(item => ({ ...item, isReconciled: !!checked }))
                        );
                      }}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={item.isReconciled}
                        onCheckedChange={() => handleItemToggle(item.id)}
                      />
                    </TableCell>
                    <TableCell>{item.date.toLocaleDateString()}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'DEPOSIT' ? 'default' : 'secondary'}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatter.format(item.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isReconciled ? 'default' : 'outline'}>
                        {item.isReconciled ? 'Reconciled' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}