
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { 
  LoginResponse,
  MenuItemWithCategory, 
  Category, 
  CreateTransactionInput, 
  TransactionItemInput,
  PaymentMethod 
} from '../../../server/src/schema';

// Type for user without password (from login response)
type SafeUser = LoginResponse['user'];

interface PosSystemProps {
  currentUser: SafeUser;
}

interface CartItem {
  menuItem: MenuItemWithCategory;
  quantity: number;
  notes?: string;
}

export function PosSystem({ currentUser }: PosSystemProps) {
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReceived, setPaymentReceived] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [error, setError] = useState<string>('');

  const loadMenuItems = useCallback(async () => {
    try {
      const items = await trpc.getMenuItems.query();
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await trpc.getCategories.query();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadMenuItems();
    loadCategories();
  }, [loadMenuItems, loadCategories]);

  const filteredMenuItems = menuItems.filter((item: MenuItemWithCategory) => {
    const matchesCategory = selectedCategory === 'all' || item.category_id.toString() === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch && item.is_available;
  });

  const addToCart = (menuItem: MenuItemWithCategory) => {
    setCart((prev: CartItem[]) => {
      const existingItem = prev.find((item: CartItem) => item.menuItem.id === menuItem.id);
      if (existingItem) {
        return prev.map((item: CartItem) => 
          item.menuItem.id === menuItem.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const updateCartQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev: CartItem[]) => prev.filter((item: CartItem) => item.menuItem.id !== menuItemId));
    } else {
      setCart((prev: CartItem[]) => 
        prev.map((item: CartItem) => 
          item.menuItem.id === menuItemId 
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const updateCartNotes = (menuItemId: number, notes: string) => {
    setCart((prev: CartItem[]) => 
      prev.map((item: CartItem) => 
        item.menuItem.id === menuItemId 
          ? { ...item, notes: notes || undefined }
          : item
      )
    );
  };

  const removeFromCart = (menuItemId: number) => {
    setCart((prev: CartItem[]) => prev.filter((item: CartItem) => item.menuItem.id !== menuItemId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPaymentReceived(0);
    setDiscount(0);
    setNotes('');
    setError('');
  };

  const subtotal = cart.reduce((sum: number, item: CartItem) => 
    sum + (item.menuItem.price * item.quantity), 0
  );

  const taxRate = 0.1; // 10% tax
  const taxAmount = subtotal * taxRate;
  const discountAmount = discount;
  const totalAmount = subtotal + taxAmount - discountAmount;
  const changeAmount = paymentReceived - totalAmount;

  const handleProcessPayment = async () => {
    if (cart.length === 0) {
      setError('Keranjang kosong');
      return;
    }

    if (paymentReceived < totalAmount) {
      setError('Pembayaran tidak mencukupi');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const transactionItems: TransactionItemInput[] = cart.map((item: CartItem) => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        notes: item.notes || null
      }));

      const transactionData: CreateTransactionInput = {
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items: transactionItems,
        subtotal: subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_received: paymentReceived,
        notes: notes || null,
        cashier_id: currentUser.id
      };

      await trpc.createTransaction.mutate(transactionData);
      
      // Show success and reset form
      alert(`Transaksi berhasil!\nTotal: Rp ${totalAmount.toLocaleString()}\nKembali: Rp ${changeAmount.toLocaleString()}`);
      clearCart();
      setShowPaymentDialog(false);
    } catch (error) {
      console.error('Transaction failed:', error);
      setError('Transaksi gagal. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Menu Items */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🍽️ Menu Items
            </CardTitle>
            <CardDescription>
              Pilih item untuk ditambahkan ke keranjang
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Cari menu..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMenuItems.map((item: MenuItemWithCategory) => (
                <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm">{item.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {item.category.name}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-orange-600">
                        Rp {item.price.toLocaleString()}
                      </span>
                      <Button 
                        size="sm" 
                        onClick={() => addToCart(item)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        +
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredMenuItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Tidak ada menu yang ditemukan
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cart */}
      <div>
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              🛒 Keranjang
              {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  Hapus Semua
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Keranjang kosong
              </p>
            ) : (
              <div className="space-y-4">
                {cart.map((item: CartItem) => (
                  <div key={item.menuItem.id} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm">{item.menuItem.name}</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeFromCart(item.menuItem.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateCartQuantity(item.menuItem.id, item.quantity - 1)}
                        className="h-8 w-8 p-0"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateCartQuantity(item.menuItem.id, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        +
                      </Button>
                    </div>
                    <Input
                      placeholder="Catatan (opsional)"
                      value={item.notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        updateCartNotes(item.menuItem.id, e.target.value)
                      }
                      className="text-xs mb-2"
                    />
                    <div className="text-right font-semibold text-orange-600">
                      Rp {(item.menuItem.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pajak (10%):</span>
                    <span>Rp {taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diskon:</span>
                    <span>- Rp {discountAmount.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-orange-600">Rp {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-orange-600 hover:bg-orange-700">
                      Proses Pembayaran
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Proses Pembayaran</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Nama Pelanggan</label>
                          <Input
                            placeholder="Opsional"
                            value={customerName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">No. Telepon</label>
                          <Input
                            placeholder="Opsional"
                            value={customerPhone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Metode Pembayaran</label>
                        <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Tunai</SelectItem>
                            <SelectItem value="CARD">Kartu</SelectItem>
                            <SelectItem value="DIGITAL_WALLET">E-Wallet</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Diskon (Rp)</label>
                          <Input
                            type="number"
                            min="0"
                            value={discount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscount(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Pembayaran Diterima</label>
                          <Input
                            type="number"
                            min="0"
                            value={paymentReceived}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentReceived(parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Catatan</label>
                        <Textarea
                          placeholder="Catatan transaksi (opsional)"
                          value={notes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                        />
                      </div>

                      <div className="bg-gray-50 p-4 rounded space-y-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span>Rp {totalAmount.toLocaleString()}</span>
                        </div>
                        {paymentReceived > 0 && (
                          <div className="flex justify-between">
                            <span>Kembali:</span>
                            <span className={changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              Rp {changeAmount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowPaymentDialog(false)}
                          className="flex-1"
                        >
                          Batal
                        </Button>
                        <Button 
                          onClick={handleProcessPayment}
                          disabled={isProcessing || paymentReceived < totalAmount}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                        >
                          {isProcessing ? 'Memproses...' : 'Bayar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
