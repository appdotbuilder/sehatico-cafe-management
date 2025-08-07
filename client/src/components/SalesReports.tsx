
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import type { TransactionWithItems } from '../../../server/src/schema';

export function SalesReports() {
  const [dailyReport, setDailyReport] = useState<{
    totalSales: number;
    totalTransactions: number;
    averageTransaction: number;
    topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  } | null>(null);
  const [dateRangeTransactions, setDateRangeTransactions] = useState<TransactionWithItems[]>([]);
  const [cashierTransactions, setCashierTransactions] = useState<TransactionWithItems[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashierId, setCashierId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  const loadDailyReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const date = new Date(selectedDate);
      const report = await trpc.getDailySalesReport.query({ date });
      setDailyReport(report);
    } catch (error) {
      console.error('Failed to load daily report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  const loadDateRangeTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const transactions = await trpc.getTransactionsByDateRange.query({ 
        startDate: start, 
        endDate: end 
      });
      setDateRangeTransactions(transactions);
    } catch (error) {
      console.error('Failed to load date range transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  const loadCashierTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const transactions = await trpc.getTransactionsByCashier.query({ cashierId });
      setCashierTransactions(transactions);
    } catch (error) {
      console.error('Failed to load cashier transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cashierId]);

  const calculateRangeSummary = (transactions: TransactionWithItems[]) => {
    if (transactions.length === 0) return null;

    const totalSales = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalTransactions = transactions.length;
    const averageTransaction = totalSales / totalTransactions;

    const paymentMethods = transactions.reduce((acc, t) => {
      acc[t.payment_method] = (acc[t.payment_method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      paymentMethods
    };
  };

  const rangeSummary = calculateRangeSummary(dateRangeTransactions);
  const cashierSummary = calculateRangeSummary(cashierTransactions);

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
      <div>
        <h2 className="text-2xl font-bold">Laporan Penjualan</h2>
        <p className="text-gray-600">Analisis penjualan dan performa bisnis</p>
      </div>

      {/* Daily Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Laporan Harian
          </CardTitle>
          <CardDescription>
            Ringkasan penjualan per hari
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Pilih Tanggal</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button 
              onClick={loadDailyReport}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? 'Memuat...' : 'Lihat Laporan'}
            </Button>
          </div>

          {dailyReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  Rp {dailyReport.totalSales.toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">Total Penjualan</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {dailyReport.totalTransactions}
                </div>
                <div className="text-sm text-green-700">Total Transaksi</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  Rp {Math.round(dailyReport.averageTransaction).toLocaleString()}
                </div>
                <div className="text-sm text-purple-700">Rata-rata per Transaksi</div>
              </div>
            </div>
          )}

          {dailyReport && dailyReport.topSellingItems.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Item Terlaris</h3>
              <div className="space-y-2">
                {dailyReport.topSellingItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <div className="text-sm text-gray-600">{item.quantity} porsi terjual</div>
                    </div>
                    <div className="font-semibold text-orange-600">
                      Rp {item.revenue.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Range Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📅 Laporan Rentang Tanggal
          </CardTitle>
          <CardDescription>
            Analisis penjualan dalam periode tertentu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tanggal Akhir</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              />
            </div>
            <Button 
              onClick={loadDateRangeTransactions}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? 'Memuat...' : 'Lihat Laporan'}
            </Button>
          </div>

          {rangeSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    Rp {rangeSummary.totalSales.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700">Total Penjualan</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {rangeSummary.totalTransactions}
                  </div>
                  <div className="text-sm text-green-700">Total Transaksi</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    Rp {Math.round(rangeSummary.averageTransaction).toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-700">Rata-rata per Transaksi</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Metode Pembayaran</h3>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(rangeSummary.paymentMethods).map(([method, count]) => (
                    <Badge key={method} variant="outline">
                      {getPaymentMethodLabel(method)}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {dateRangeTransactions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Daftar Transaksi</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Pembayaran</TableHead>
                      <TableHead>Kasir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateRangeTransactions.slice(0, 10).map((transaction: TransactionWithItems) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono">#{transaction.id}</TableCell>
                        <TableCell>
                          {transaction.transaction_date.toLocaleDateString('id-ID')}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {dateRangeTransactions.length > 10 && (
                <div className="text-center text-sm text-gray-500 mt-2">
                  Menampilkan 10 dari {dateRangeTransactions.length} transaksi
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cashier Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👤 Performa Kasir
          </CardTitle>
          <CardDescription>
            Analisis performa berdasarkan kasir
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">ID Kasir</label>
              <Input
                type="number"
                min="1"
                value={cashierId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCashierId(parseInt(e.target.value) || 1)}
                placeholder="Masukkan ID kasir"
              />
            </div>
            <Button 
              onClick={loadCashierTransactions}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? 'Memuat...' : 'Lihat Performa'}
            </Button>
          </div>

          {cashierSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  Rp {cashierSummary.totalSales.toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">Total Penjualan</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {cashierSummary.totalTransactions}
                </div>
                <div className="text-sm text-green-700">Total Transaksi</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  Rp {Math.round(cashierSummary.averageTransaction).toLocaleString()}
                </div>
                <div className="text-sm text-purple-700">Rata-rata per Transaksi</div>
              </div>
            </div>
          )}

          {cashierTransactions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">
                Transaksi oleh {cashierTransactions[0].cashier.full_name}
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Pembayaran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashierTransactions.slice(0, 10).map((transaction: TransactionWithItems) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono">#{transaction.id}</TableCell>
                        <TableCell>
                          {transaction.transaction_date.toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="font-semibold">
                          Rp {transaction.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getPaymentMethodLabel(transaction.payment_method)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
