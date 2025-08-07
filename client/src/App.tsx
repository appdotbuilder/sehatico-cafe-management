
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { LoginInput, LoginResponse } from '../../server/src/schema';
import { LoginForm } from '@/components/LoginForm';
import { MenuManagement } from '@/components/MenuManagement';
import { CategoryManagement } from '@/components/CategoryManagement';
import { TransactionManagement } from '@/components/TransactionManagement';
import { PosSystem } from '@/components/PosSystem';
import { SalesReports } from '@/components/SalesReports';
import { UserManagement } from '@/components/UserManagement';

// Type for user without password (from login response)
type SafeUser = LoginResponse['user'];

function App() {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pos');

  // Initialize app
  useEffect(() => {
    // Check for stored auth token and validate
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('current_user');
    
    if (storedToken && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
      }
    }
  }, []);

  const handleLogin = async (loginData: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await trpc.login.mutate(loginData);
      setCurrentUser(response.user);
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('current_user', JSON.stringify(response.user));
      
      // Set default tab based on role
      if (response.user.role === 'KASIR') {
        setActiveTab('pos');
      } else {
        setActiveTab('menu');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    setActiveTab('pos');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-orange-800 mb-2">☕ SEHATI KAFE</h1>
            <p className="text-orange-600">Sistem Manajemen Kafe</p>
          </div>
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-orange-800">☕ SEHATI KAFE</h1>
              <Badge variant={isAdmin ? 'default' : 'secondary'}>
                {currentUser.role}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Selamat datang, <strong>{currentUser.full_name}</strong>
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-8">
            <TabsTrigger value="pos" className="text-xs sm:text-sm">
              🛒 Kasir
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="menu" className="text-xs sm:text-sm">
                  🍽️ Menu
                </TabsTrigger>
                <TabsTrigger value="categories" className="text-xs sm:text-sm">
                  📂 Kategori
                </TabsTrigger>
                <TabsTrigger value="transactions" className="text-xs sm:text-sm">
                  📋 Transaksi
                </TabsTrigger>
                <TabsTrigger value="reports" className="text-xs sm:text-sm">
                  📊 Laporan
                </TabsTrigger>
                <TabsTrigger value="users" className="text-xs sm:text-sm">
                  👥 Pengguna
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="pos">
            <PosSystem currentUser={currentUser} />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="menu">
                <MenuManagement />
              </TabsContent>

              <TabsContent value="categories">
                <CategoryManagement />
              </TabsContent>

              <TabsContent value="transactions">
                <TransactionManagement />
              </TabsContent>

              <TabsContent value="reports">
                <SalesReports />
              </TabsContent>

              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default App;
