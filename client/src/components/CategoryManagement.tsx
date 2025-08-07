
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../server/src/schema';

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: '',
    description: null
  });

  const loadCategories = useCallback(async () => {
    try {
      const cats = await trpc.getCategories.query();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Gagal memuat kategori');
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = categories.filter((category: Category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: null
    });
    setEditingCategory(null);
    setError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const newCategory = await trpc.createCategory.mutate(formData);
      setCategories((prev: Category[]) => [...prev, newCategory]);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create category:', error);
      setError('Gagal membuat kategori');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setIsLoading(true);
    setError('');

    try {
      const updateData: UpdateCategoryInput = {
        id: editingCategory.id,
        ...formData
      };
      
      const updatedCategory = await trpc.updateCategory.mutate(updateData);
      setCategories((prev: Category[]) => 
        prev.map((cat: Category) => 
          cat.id === editingCategory.id ? updatedCategory : cat
        )
      );
      setEditingCategory(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update category:', error);
      setError('Gagal mengupdate kategori');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || null
    });
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const updateData: UpdateCategoryInput = {
        id: category.id,
        is_active: !category.is_active
      };
      
      const updatedCategory = await trpc.updateCategory.mutate(updateData);
      setCategories((prev: Category[]) => 
        prev.map((cat: Category) => 
          cat.id === category.id ? updatedCategory : cat
        )
      );
    } catch (error) {
      console.error('Failed to toggle category status:', error);
      setError('Gagal mengubah status kategori');
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Yakin ingin menghapus kategori "${category.name}"?`)) return;

    try {
      await trpc.deleteCategory.mutate({ id: category.id });
      setCategories((prev: Category[]) => 
        prev.filter((cat: Category) => cat.id !== category.id)
      );
    } catch (error) {
      console.error('Failed to delete category:', error);
      setError('Gagal menghapus kategori');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Kategori</h2>
          <p className="text-gray-600">Kelola kategori menu makanan dan minuman</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              + Tambah Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Kategori Baru</DialogTitle>
              <DialogDescription>
                Isi form untuk menambahkan kategori baru
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nama Kategori</label>
                <Input
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCategoryInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Masukkan nama kategori"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Deskripsi</label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateCategoryInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  placeholder="Deskripsi kategori (opsional)"
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

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Cari kategori..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="sm:w-64"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category: Category) => (
          <Card key={category.id} className={!category.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                  {category.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
              {category.description && (
                <CardDescription>{category.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Status:</span>
                <Switch
                  checked={category.is_active}
                  onCheckedChange={() => handleToggleActive(category)}
                />
              </div>
              
              <div className="text-xs text-gray-500 mb-3">
                Dibuat: {category.created_at.toLocaleDateString('id-ID')}
                {category.updated_at && (
                  <div>Diupdate: {category.updated_at.toLocaleDateString('id-ID')}</div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(category)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(category)}
                  className="flex-1"
                >
                  Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'Tidak ada kategori yang ditemukan' : 'Belum ada kategori. Tambahkan kategori pertama!'}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open: boolean) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
            <DialogDescription>
              Ubah informasi kategori
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Kategori</label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCategoryInput) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Masukkan nama kategori"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Deskripsi</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateCategoryInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                placeholder="Deskripsi kategori (opsional)"
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
                onClick={() => { setEditingCategory(null); resetForm(); }}
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
