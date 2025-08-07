
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { 
  MenuItemWithCategory, 
  CreateMenuItemInput, 
  UpdateMenuItemInput, 
  Category 
} from '../../../server/src/schema';

export function MenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemWithCategory | null>(null);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [formData, setFormData] = useState<CreateMenuItemInput>({
    name: '',
    description: null,
    price: 0,
    category_id: 0,
    image_url: null
  });

  const loadMenuItems = useCallback(async () => {
    try {
      const items = await trpc.getMenuItems.query();
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
      setError('Gagal memuat menu items');
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
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: null,
      price: 0,
      category_id: 0,
      image_url: null
    });
    setEditingItem(null);
    setError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const newItem = await trpc.createMenuItem.mutate(formData);
      // Since API returns MenuItem, we need to add category info
      const categoryInfo = categories.find((c: Category) => c.id === formData.category_id);
      const itemWithCategory: MenuItemWithCategory = {
        ...newItem,
        category: { name: categoryInfo?.name || 'Unknown' }
      };
      
      setMenuItems((prev: MenuItemWithCategory[]) => [...prev, itemWithCategory]);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create menu item:', error);
      setError('Gagal membuat menu item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsLoading(true);
    setError('');

    try {
      const updateData: UpdateMenuItemInput = {
        id: editingItem.id,
        ...formData
      };
      
      const updatedItem = await trpc.updateMenuItem.mutate(updateData);
      const categoryInfo = categories.find((c: Category) => c.id === updatedItem.category_id);
      const itemWithCategory: MenuItemWithCategory = {
        ...updatedItem,
        category: { name: categoryInfo?.name || 'Unknown' }
      };
      
      setMenuItems((prev: MenuItemWithCategory[]) => 
        prev.map((item: MenuItemWithCategory) => 
          item.id === editingItem.id ? itemWithCategory : item
        )
      );
      setEditingItem(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update menu item:', error);
      setError('Gagal mengupdate menu item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: MenuItemWithCategory) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || null,
      price: item.price,
      category_id: item.category_id,
      image_url: item.image_url || null
    });
  };

  const handleToggleAvailability = async (item: MenuItemWithCategory) => {
    try {
      const updateData: UpdateMenuItemInput = {
        id: item.id,
        is_available: !item.is_available
      };
      
      const updatedItem = await trpc.updateMenuItem.mutate(updateData);
      const itemWithCategory: MenuItemWithCategory = {
        ...updatedItem,
        category: item.category
      };
      
      setMenuItems((prev: MenuItemWithCategory[]) => 
        prev.map((prevItem: MenuItemWithCategory) => 
          prevItem.id === item.id ? itemWithCategory : prevItem
        )
      );
    } catch (error) {
      console.error('Failed to toggle availability:', error);
      setError('Gagal mengubah ketersediaan menu');
    }
  };

  const handleDelete = async (item: MenuItemWithCategory) => {
    if (!confirm(`Yakin ingin menghapus "${item.name}"?`)) return;

    try {
      await trpc.deleteMenuItem.mutate({ id: item.id });
      setMenuItems((prev: MenuItemWithCategory[]) => 
        prev.filter((prevItem: MenuItemWithCategory) => prevItem.id !== item.id)
      );
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      setError('Gagal menghapus menu item');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Menu</h2>
          <p className="text-gray-600">Kelola menu makanan dan minuman</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              + Tambah Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Menu Baru</DialogTitle>
              <DialogDescription>
                Isi form untuk menambahkan menu baru
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nama Menu</label>
                <Input
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMenuItemInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Masukkan nama menu"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Deskripsi</label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  placeholder="Deskripsi menu (opsional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Harga (Rp)</label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateMenuItemInput) => ({ 
                        ...prev, 
                        price: parseFloat(e.target.value) || 0 
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Kategori</label>
                  <Select 
                    value={formData.category_id.toString()} 
                    onValueChange={(value: string) =>
                      setFormData((prev: CreateMenuItemInput) => ({ 
                        ...prev, 
                        category_id: parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">URL Gambar</label>
                <Input
                  value={formData.image_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      image_url: e.target.value || null 
                    }))
                  }
                  placeholder="URL gambar (opsional)"
                />
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
                  {isLoading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Cari menu..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="sm:w-64"
        />
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
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMenuItems.map((item: MenuItemWithCategory) => (
          <Card key={item.id} className={!item.is_available ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{item.name}</h3>
                <Badge variant={item.is_available ? 'default' : 'secondary'}>
                  {item.is_available ? 'Tersedia' : 'Habis'}
                </Badge>
              </div>
              
              <Badge variant="outline" className="mb-2">
                {item.category.name}
              </Badge>
              
              {item.description && (
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              )}
              
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-orange-600 text-lg">
                  Rp {item.price.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm">Ketersediaan:</span>
                <Switch
                  checked={item.is_available}
                  onCheckedChange={() => handleToggleAvailability(item)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(item)}
                  className="flex-1"
                >
                  Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMenuItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Tidak ada menu yang ditemukan
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open: boolean) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Menu</DialogTitle>
            <DialogDescription>
              Ubah informasi menu
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Menu</label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateMenuItemInput) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Masukkan nama menu"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Deskripsi</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateMenuItemInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                placeholder="Deskripsi menu (opsional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Harga (Rp)</label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      price: parseFloat(e.target.value) || 0 
                    }))
                  }
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Kategori</label>
                <Select 
                  value={formData.category_id.toString()} 
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      category_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">URL Gambar</label>
              <Input
                value={formData.image_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateMenuItemInput) => ({ 
                    ...prev, 
                    image_url: e.target.value || null 
                  }))
                }
                placeholder="URL gambar (opsional)"
              />
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
                onClick={() => { setEditingItem(null); resetForm(); }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {isLoading ? 'Menyimpan...' : 'Update'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
