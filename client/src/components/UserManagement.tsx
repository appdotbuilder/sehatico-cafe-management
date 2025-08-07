
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { CreateUserInput, UserRole } from '../../../server/src/schema';

export function UserManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    password: '',
    role: 'KASIR',
    full_name: ''
  });

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'KASIR',
      full_name: ''
    });
    setError('');
    setSuccess('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await trpc.createUser.mutate(formData);
      setSuccess(`Pengguna "${formData.full_name}" berhasil dibuat!`);
      resetForm();
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create user:', error);
      setError('Gagal membuat pengguna. Username mungkin sudah digunakan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeAdmin = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await trpc.initializeAdmin.mutate();
      setSuccess('Admin default berhasil diinisialisasi! Username: admin, Password: admin');
    } catch (error) {
      console.error('Failed to initialize admin:', error);
      setError('Gagal menginisialisasi admin. Admin mungkin sudah ada.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Pengguna</h2>
          <p className="text-gray-600">Kelola akun admin dan kasir</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleInitializeAdmin}
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : 'Init Admin'}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                + Tambah Pengguna
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                <DialogDescription>
                  Buat akun baru untuk admin atau kasir
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    value={formData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder="Username untuk login"
                    required
                    minLength={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Password (min. 6 karakter)"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Nama Lengkap</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, full_name: e.target.value }))
                    }
                    placeholder="Nama lengkap pengguna"
                    required
                    minLength={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select 
                    value={formData.role || 'KASIR'} 
                    onValueChange={(value: UserRole) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="KASIR">Kasir</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-gray-500 mt-1">
                    Admin: Akses penuh sistem<br />
                    Kasir: Hanya akses POS
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setShowCreateDialog(false); resetForm(); }}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {isLoading ? 'Membuat...' : 'Buat Pengguna'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* User Management Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              👑 Admin
            </CardTitle>
            <CardDescription>
              Administrator sistem dengan akses penuh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Akses Menu Management</span>
                <Badge variant="default">✓</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses Category Management</span>
                <Badge variant="default">✓</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses Transaction History</span>
                <Badge variant="default">✓</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses Sales Reports</span>
                <Badge variant="default">✓</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses User Management</span>
                <Badge variant="default">✓</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses POS System</span>
                <Badge variant="default">✓</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🛒 Kasir
            </CardTitle>
            <CardDescription>
              Kasir dengan akses terbatas untuk transaksi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Akses Menu Management</span>
                <Badge variant="secondary">✗</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses Category Management</span>
                <Badge variant="secondary">✗</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses Transaction History</span>
                <Badge variant="secondary">✗</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses Sales Reports</span>
                <Badge variant="secondary">✗</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses User Management</span>
                <Badge variant="secondary">✗</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Akses POS System</span>
                <Badge variant="default">✓</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Default Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Kredensial Default</CardTitle>
          <CardDescription>
            Gunakan kredensial berikut untuk login pertama kali
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div><strong>Username:</strong> admin</div>
            <div><strong>Password:</strong> admin</div>
            <div><strong>Role:</strong> ADMIN</div>
            <div className="text-sm text-gray-600 mt-2">
              Setelah login, Anda dapat membuat akun kasir baru atau admin tambahan.
              Pastikan untuk mengubah password default untuk keamanan.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Panduan Pengelolaan Pengguna</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Inisialisasi Admin Default</h3>
            <p className="text-sm text-gray-600">
              Klik tombol "Init Admin" untuk membuat akun administrator default dengan username "admin" dan password "admin".
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">2. Membuat Pengguna Baru</h3>
            <p className="text-sm text-gray-600">
              Gunakan tombol "Tambah Pengguna" untuk membuat akun admin atau kasir baru. 
              Pastikan username unik dan password minimal 6 karakter.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Perbedaan Role</h3>
            <p className="text-sm text-gray-600">
              Admin memiliki akses penuh ke semua fitur sistem, sedangkan Kasir hanya dapat mengakses sistem POS 
              untuk memproses transaksi penjualan.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Keamanan</h3>
            <p className="text-sm text-gray-600">
              Selalu gunakan password yang kuat dan ubah password default setelah instalasi pertama. 
              Jangan berbagi kredensial login dengan orang yang tidak berwenang.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
