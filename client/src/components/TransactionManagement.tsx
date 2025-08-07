
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import type { TransactionWithItems } from '../../../server/src/schema';

export function TransactionManagement() {
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await trpc.getTransactions.query({ limit: 50, offset: 0 });
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter((transaction: TransactionWithItems) => {
    const matchesSearch = !searchTerm || 
      transaction.id.toString().includes(searchTerm) ||
      (transaction.customer_name && transaction.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      transaction.cashier.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || 
      transaction.transaction_date.toISOString().split('T')[0] === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'CASH': 'Tunai',
      'CARD': 'Kartu',
      'DIGITAL_WALLET': 'E-Wallet',
      'BANK_TRANSFER': 'Transfer Bank'
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Riwayat Transaksi</h2>
          <p className="text-gray-600">Lihat dan kelola semua transaksi</p>
        </div>
        <Button onClick={loadTransactions} disabled={isLoading}>
          {isLoading ? 'Memuat...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Cari transaksi (ID, customer, kasir)..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="sm:w-80"
        />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)}
          className="sm:w-48"
        />
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>
            Total {filteredTransactions.length} transaksi ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction: TransactionWithItems) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono">#{transaction.id}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {transaction.transaction_date.toLocaleDateString('id-ID')}
                        <div className="text-xs text-gray-500">
                          {transaction.transaction_date.toLocaleTimeString('id-ID')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.customer_name || (
                        <span className="text-gray-500 italic">Pelanggan umum</span>
                      )}
                      {transaction.customer_phone && (
                        <div className="text-xs text-gray-600">
                          {transaction.customer_phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      Rp {transaction.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPaymentMethodLabel(transaction.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.cashier.full_name}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Detail
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detail Transaksi #{transaction.id}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Transaction Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Tanggal:</strong><br />
                                {transaction.transaction_date.toLocaleString('id-ID')}
                              </div>
                              <div>
                                <strong>Kasir:</strong><br />
                                {transaction.cashier.full_name}
                              </div>
                              <div>
                                <strong>Pelanggan:</strong><br />
                                {transaction.customer_name || 'Pelanggan umum'}
                              </div>
                              <div>
                                <strong>Telepon:</strong><br />
                                {transaction.customer_phone || '-'}
                              </div>
                            </div>

                            <Separator />

                            {/* Items */}
                            <div>
                              <h3 className="font-semibold mb-2">Items</h3>
                              <div className="space-y-2">
                                {transaction.items.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <div className="flex-1">
                                      <div className="font-medium">Item #{item.menu_item_id}</div>
                                      <div className="text-sm text-gray-600">
                                        {item.quantity}x @ Rp {item.unit_price.toLocaleString()}
                                      </div>
                                      {item.notes && (
                                        <div className="text-xs text-gray-500 italic">
                                          Catatan: {item.notes}
                                        </div>
                                      )}
                                    </div>
                                    <div className="font-semibold">
                                      Rp {item.total_price.toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <Separator />

                            {/* Totals */}
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>Rp {transaction.subtotal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Pajak:</span>
                                <span>Rp {transaction.tax_amount.toLocaleString()}</span>
                              </div>
                              {transaction.discount_amount > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Diskon:</span>
                                  <span>- Rp {transaction.discount_amount.toLocaleString()}</span>
                                </div>
                              )}
                              <Separator />
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span>Rp {transaction.total_amount.toLocaleString()}</span>
                              </div>
                            </div>

                            <Separator />

                            {/* Payment Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Metode Pembayaran:</strong><br />
                                <Badge variant="outline">
                                  {getPaymentMethodLabel(transaction.payment_method)}
                                </Badge>
                              </div>
                              <div>
                                <strong>Diterima:</strong><br />
                                Rp {transaction.payment_received.toLocaleString()}
                              </div>
                              <div>
                                <strong>Kembalian:</strong><br />
                                <span className={transaction.change_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  Rp {transaction.change_amount.toLocaleString()}
                                </span>
                              </div>
                              {transaction.notes && (
                                <div>
                                  <strong>Catatan:</strong><br />
                                  {transaction.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {isLoading ? 'Memuat transaksi...' : 'Tidak ada transaksi ditemukan'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
