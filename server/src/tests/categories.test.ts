
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput, type UpdateCategoryInput } from '../schema';
import { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../handlers/categories';
import { eq } from 'drizzle-orm';

const testCategoryInput: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing'
};

describe('Categories handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCategory', () => {
    it('should create a category with description', async () => {
      const result = await createCategory(testCategoryInput);

      expect(result.name).toEqual('Test Category');
      expect(result.description).toEqual('A category for testing');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeNull();
    });

    it('should create a category without description', async () => {
      const input: CreateCategoryInput = {
        name: 'Simple Category'
      };

      const result = await createCategory(input);

      expect(result.name).toEqual('Simple Category');
      expect(result.description).toBeNull();
      expect(result.is_active).toBe(true);
    });

    it('should save category to database', async () => {
      const result = await createCategory(testCategoryInput);

      const categories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, result.id))
        .execute();

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toEqual('Test Category');
      expect(categories[0].description).toEqual('A category for testing');
      expect(categories[0].is_active).toBe(true);
    });
  });

  describe('getCategories', () => {
    it('should return empty array when no categories exist', async () => {
      const result = await getCategories();
      expect(result).toEqual([]);
    });

    it('should return only active categories', async () => {
      // Create active category
      const activeCategory = await createCategory(testCategoryInput);
      
      // Create inactive category
      const inactiveCategory = await createCategory({
        name: 'Inactive Category',
        description: 'This will be inactive'
      });
      
      await db.update(categoriesTable)
        .set({ is_active: false })
        .where(eq(categoriesTable.id, inactiveCategory.id))
        .execute();

      const result = await getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(activeCategory.id);
      expect(result[0].name).toEqual('Test Category');
      expect(result[0].is_active).toBe(true);
    });

    it('should return multiple active categories', async () => {
      await createCategory(testCategoryInput);
      await createCategory({
        name: 'Another Category',
        description: 'Second test category'
      });

      const result = await getCategories();

      expect(result).toHaveLength(2);
      expect(result.every(cat => cat.is_active)).toBe(true);
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', async () => {
      const created = await createCategory(testCategoryInput);
      
      const result = await getCategoryById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Test Category');
      expect(result!.description).toEqual('A category for testing');
    });

    it('should return null when category not found', async () => {
      const result = await getCategoryById(999);
      expect(result).toBeNull();
    });

    it('should return inactive category by id', async () => {
      const created = await createCategory(testCategoryInput);
      
      // Make it inactive
      await db.update(categoriesTable)
        .set({ is_active: false })
        .where(eq(categoriesTable.id, created.id))
        .execute();

      const result = await getCategoryById(created.id);

      expect(result).not.toBeNull();
      expect(result!.is_active).toBe(false);
    });
  });

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const created = await createCategory(testCategoryInput);
      
      const updateInput: UpdateCategoryInput = {
        id: created.id,
        name: 'Updated Category Name'
      };

      const result = await updateCategory(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Category Name');
      expect(result.description).toEqual('A category for testing'); // unchanged
      expect(result.is_active).toBe(true); // unchanged
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update category description', async () => {
      const created = await createCategory(testCategoryInput);
      
      const updateInput: UpdateCategoryInput = {
        id: created.id,
        description: 'Updated description'
      };

      const result = await updateCategory(updateInput);

      expect(result.name).toEqual('Test Category'); // unchanged
      expect(result.description).toEqual('Updated description');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update category active status', async () => {
      const created = await createCategory(testCategoryInput);
      
      const updateInput: UpdateCategoryInput = {
        id: created.id,
        is_active: false
      };

      const result = await updateCategory(updateInput);

      expect(result.is_active).toBe(false);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update multiple fields at once', async () => {
      const created = await createCategory(testCategoryInput);
      
      const updateInput: UpdateCategoryInput = {
        id: created.id,
        name: 'Completely Updated',
        description: 'New description',
        is_active: false
      };

      const result = await updateCategory(updateInput);

      expect(result.name).toEqual('Completely Updated');
      expect(result.description).toEqual('New description');
      expect(result.is_active).toBe(false);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error when category not found', async () => {
      const updateInput: UpdateCategoryInput = {
        id: 999,
        name: 'Non-existent'
      };

      await expect(updateCategory(updateInput)).rejects.toThrow(/not found/i);
    });

    it('should update database record', async () => {
      const created = await createCategory(testCategoryInput);
      
      const updateInput: UpdateCategoryInput = {
        id: created.id,
        name: 'Database Updated'
      };

      await updateCategory(updateInput);

      const dbCategory = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, created.id))
        .execute();

      expect(dbCategory[0].name).toEqual('Database Updated');
      expect(dbCategory[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('deleteCategory', () => {
    it('should soft delete category (set is_active to false)', async () => {
      const created = await createCategory(testCategoryInput);
      
      const result = await deleteCategory(created.id);

      expect(result).toBe(true);

      // Verify category is soft deleted
      const dbCategory = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, created.id))
        .execute();

      expect(dbCategory[0].is_active).toBe(false);
      expect(dbCategory[0].updated_at).toBeInstanceOf(Date);
    });

    it('should return false when category not found', async () => {
      const result = await deleteCategory(999);
      expect(result).toBe(false);
    });

    it('should not appear in getCategories after deletion', async () => {
      const created = await createCategory(testCategoryInput);
      
      // Verify it appears in active categories
      let categories = await getCategories();
      expect(categories).toHaveLength(1);

      // Delete it
      await deleteCategory(created.id);

      // Verify it no longer appears in active categories
      categories = await getCategories();
      expect(categories).toHaveLength(0);
    });

    it('should still be retrievable by ID after soft delete', async () => {
      const created = await createCategory(testCategoryInput);
      
      await deleteCategory(created.id);

      const result = await getCategoryById(created.id);
      expect(result).not.toBeNull();
      expect(result!.is_active).toBe(false);
    });
  });
});
