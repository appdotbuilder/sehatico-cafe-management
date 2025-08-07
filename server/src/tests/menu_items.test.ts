
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, menuItemsTable } from '../db/schema';
import { type CreateMenuItemInput, type UpdateMenuItemInput } from '../schema';
import { 
  getMenuItems, 
  getMenuItemsByCategory, 
  getMenuItemById, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem 
} from '../handlers/menu_items';
import { eq } from 'drizzle-orm';

// Test data
const testCategory = {
  name: 'Beverages',
  description: 'Hot and cold drinks',
  is_active: true
};

describe('Menu Items Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createMenuItem', () => {
    it('should create a menu item', async () => {
      // Create prerequisite category
      const categoryResults = await db.insert(categoriesTable).values(testCategory).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const result = await createMenuItem(testMenuItemInput);

      expect(result.name).toEqual('Espresso');
      expect(result.description).toEqual('Strong black coffee');
      expect(result.price).toEqual(15000);
      expect(typeof result.price).toEqual('number');
      expect(result.category_id).toEqual(categoryId);
      expect(result.is_available).toEqual(true);
      expect(result.image_url).toEqual('https://example.com/espresso.jpg');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save menu item to database', async () => {
      // Create prerequisite category
      const categoryResults = await db.insert(categoriesTable).values(testCategory).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const result = await createMenuItem(testMenuItemInput);

      const menuItems = await db.select()
        .from(menuItemsTable)
        .where(eq(menuItemsTable.id, result.id))
        .execute();

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].name).toEqual('Espresso');
      expect(parseFloat(menuItems[0].price)).toEqual(15000);
      expect(menuItems[0].category_id).toEqual(categoryId);
    });

    it('should throw error for non-existent category', async () => {
      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: 999,
        image_url: 'https://example.com/espresso.jpg'
      };

      await expect(createMenuItem(testMenuItemInput)).rejects.toThrow(/category not found/i);
    });

    it('should throw error for inactive category', async () => {
      // Create inactive category
      const categoryResults = await db.insert(categoriesTable).values({
        ...testCategory,
        is_active: false
      }).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      await expect(createMenuItem(testMenuItemInput)).rejects.toThrow(/category not found/i);
    });
  });

  describe('getMenuItemById', () => {
    it('should return menu item by ID', async () => {
      // Create prerequisite category and menu item
      const categoryResults = await db.insert(categoriesTable).values(testCategory).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const menuItem = await createMenuItem(testMenuItemInput);

      const result = await getMenuItemById(menuItem.id);

      expect(result).toBeDefined();
      expect(result!.name).toEqual('Espresso');
      expect(result!.price).toEqual(15000);
      expect(typeof result!.price).toEqual('number');
      expect(result!.category_id).toEqual(categoryId);
    });

    it('should return null for non-existent ID', async () => {
      const result = await getMenuItemById(999);
      expect(result).toBeNull();
    });
  });

  describe('getMenuItemsByCategory', () => {
    it('should return menu items by category', async () => {
      // Create prerequisite category and menu items
      const categoryResults = await db.insert(categoriesTable).values(testCategory).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput1: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const testMenuItemInput2: CreateMenuItemInput = {
        name: 'Americano',
        description: 'Diluted espresso',
        price: 18000,
        category_id: categoryId
      };

      await createMenuItem(testMenuItemInput1);
      await createMenuItem(testMenuItemInput2);

      const results = await getMenuItemsByCategory(categoryId);

      expect(results).toHaveLength(2);
      expect(results[0].name).toEqual('Espresso');
      expect(results[1].name).toEqual('Americano');
      results.forEach(item => {
        expect(typeof item.price).toEqual('number');
        expect(item.category_id).toEqual(categoryId);
        expect(item.is_available).toEqual(true);
      });
    });

    it('should only return available menu items', async () => {
      // Create prerequisite category and menu items
      const categoryResults = await db.insert(categoriesTable).values(testCategory).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const menuItem = await createMenuItem(testMenuItemInput);
      
      // Make one item unavailable
      await db.update(menuItemsTable)
        .set({ is_available: false })
        .where(eq(menuItemsTable.id, menuItem.id))
        .execute();

      const results = await getMenuItemsByCategory(categoryId);

      expect(results).toHaveLength(0);
    });
  });

  describe('getMenuItems', () => {
    it('should return all available menu items with categories', async () => {
      // Create categories and menu items
      const categoryResults = await db.insert(categoriesTable).values([
        testCategory,
        { name: 'Food', description: 'Meals and snacks', is_active: true }
      ]).returning().execute();

      const beverageCategoryId = categoryResults[0].id;
      const foodCategoryId = categoryResults[1].id;

      const testMenuItemInput1: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: beverageCategoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const testMenuItemInput2: CreateMenuItemInput = {
        name: 'Sandwich',
        description: 'Grilled sandwich',
        price: 25000,
        category_id: foodCategoryId
      };

      await createMenuItem(testMenuItemInput1);
      await createMenuItem(testMenuItemInput2);

      const results = await getMenuItems();

      expect(results).toHaveLength(2);
      expect(results[0].category.name).toEqual('Beverages');
      expect(results[1].category.name).toEqual('Food');
      results.forEach(item => {
        expect(typeof item.price).toEqual('number');
        expect(item.is_available).toEqual(true);
        expect(item.category).toBeDefined();
      });
    });

    it('should only return items from active categories', async () => {
      // Create active and inactive categories
      const categoryResults = await db.insert(categoriesTable).values([
        testCategory,
        { name: 'Inactive', description: 'Inactive category', is_active: false }
      ]).returning().execute();

      const activeCategoryId = categoryResults[0].id;
      const inactiveCategoryId = categoryResults[1].id;

      // Create menu item in active category
      const activeMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: activeCategoryId,
        image_url: 'https://example.com/espresso.jpg'
      };
      await createMenuItem(activeMenuItemInput);

      // Create menu item directly in database for inactive category (bypassing handler validation)
      await db.insert(menuItemsTable).values({
        name: 'Inactive Item',
        description: 'Item from inactive category',
        price: '10000',
        category_id: inactiveCategoryId,
        is_available: true
      }).execute();

      const results = await getMenuItems();

      expect(results).toHaveLength(1);
      expect(results[0].name).toEqual('Espresso');
    });
  });

  describe('updateMenuItem', () => {
    it('should update menu item', async () => {
      // Create prerequisite category and menu item
      const categoryResults = await db.insert(categoriesTable).values(testCategory).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const menuItem = await createMenuItem(testMenuItemInput);

      const updateInput: UpdateMenuItemInput = {
        id: menuItem.id,
        name: 'Double Espresso',
        price: 20000,
        is_available: false
      };

      const result = await updateMenuItem(updateInput);

      expect(result.name).toEqual('Double Espresso');
      expect(result.price).toEqual(20000);
      expect(typeof result.price).toEqual('number');
      expect(result.is_available).toEqual(false);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update category_id when valid', async () => {
      // Create two categories and menu item
      const categoryResults = await db.insert(categoriesTable).values([
        testCategory,
        { name: 'Food', description: 'Meals', is_active: true }
      ]).returning().execute();

      const firstCategoryId = categoryResults[0].id;
      const secondCategoryId = categoryResults[1].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: firstCategoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const menuItem = await createMenuItem(testMenuItemInput);

      const updateInput: UpdateMenuItemInput = {
        id: menuItem.id,
        category_id: secondCategoryId
      };

      const result = await updateMenuItem(updateInput);

      expect(result.category_id).toEqual(secondCategoryId);
    });

    it('should throw error for non-existent menu item', async () => {
      const updateInput: UpdateMenuItemInput = {
        id: 999,
        name: 'Non-existent'
      };

      await expect(updateMenuItem(updateInput)).rejects.toThrow(/menu item not found/i);
    });

    it('should throw error for invalid category_id', async () => {
      // Create prerequisite category and menu item
      const categoryResults = await db.insert(categoriesTable).values(testCategory).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const menuItem = await createMenuItem(testMenuItemInput);

      const updateInput: UpdateMenuItemInput = {
        id: menuItem.id,
        category_id: 999
      };

      await expect(updateMenuItem(updateInput)).rejects.toThrow(/category not found/i);
    });
  });

  describe('deleteMenuItem', () => {
    it('should soft delete menu item', async () => {
      // Create prerequisite category and menu item
      const categoryResults = await db.insert(categoriesTable).values(testCategory).returning().execute();
      const categoryId = categoryResults[0].id;

      const testMenuItemInput: CreateMenuItemInput = {
        name: 'Espresso',
        description: 'Strong black coffee',
        price: 15000,
        category_id: categoryId,
        image_url: 'https://example.com/espresso.jpg'
      };

      const menuItem = await createMenuItem(testMenuItemInput);

      const result = await deleteMenuItem(menuItem.id);

      expect(result).toEqual(true);

      // Verify soft delete
      const menuItems = await db.select()
        .from(menuItemsTable)
        .where(eq(menuItemsTable.id, menuItem.id))
        .execute();

      expect(menuItems[0].is_available).toEqual(false);
      expect(menuItems[0].updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent menu item', async () => {
      await expect(deleteMenuItem(999)).rejects.toThrow(/menu item not found/i);
    });
  });
});
