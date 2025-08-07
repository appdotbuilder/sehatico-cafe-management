
import { db } from '../db';
import { menuItemsTable, categoriesTable } from '../db/schema';
import { type MenuItem, type CreateMenuItemInput, type UpdateMenuItemInput, type MenuItemWithCategory } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getMenuItems(): Promise<MenuItemWithCategory[]> {
  try {
    const results = await db.select({
      id: menuItemsTable.id,
      name: menuItemsTable.name,
      description: menuItemsTable.description,
      price: menuItemsTable.price,
      category_id: menuItemsTable.category_id,
      is_available: menuItemsTable.is_available,
      image_url: menuItemsTable.image_url,
      created_at: menuItemsTable.created_at,
      updated_at: menuItemsTable.updated_at,
      category: {
        name: categoriesTable.name
      }
    })
    .from(menuItemsTable)
    .innerJoin(categoriesTable, eq(menuItemsTable.category_id, categoriesTable.id))
    .where(and(
      eq(menuItemsTable.is_available, true),
      eq(categoriesTable.is_active, true)
    ))
    .execute();

    return results.map(result => ({
      ...result,
      price: parseFloat(result.price) // Convert numeric to number
    }));
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
    throw error;
  }
}

export async function getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
  try {
    const results = await db.select()
      .from(menuItemsTable)
      .where(and(
        eq(menuItemsTable.category_id, categoryId),
        eq(menuItemsTable.is_available, true)
      ))
      .execute();

    return results.map(result => ({
      ...result,
      price: parseFloat(result.price) // Convert numeric to number
    }));
  } catch (error) {
    console.error('Failed to fetch menu items by category:', error);
    throw error;
  }
}

export async function getMenuItemById(id: number): Promise<MenuItem | null> {
  try {
    const results = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      ...result,
      price: parseFloat(result.price) // Convert numeric to number
    };
  } catch (error) {
    console.error('Failed to fetch menu item by ID:', error);
    throw error;
  }
}

export async function createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
  try {
    // Verify category exists and is active
    const categoryResults = await db.select()
      .from(categoriesTable)
      .where(and(
        eq(categoriesTable.id, input.category_id),
        eq(categoriesTable.is_active, true)
      ))
      .execute();

    if (categoryResults.length === 0) {
      throw new Error('Category not found or inactive');
    }

    const results = await db.insert(menuItemsTable)
      .values({
        name: input.name,
        description: input.description || null,
        price: input.price.toString(), // Convert number to string for numeric column
        category_id: input.category_id,
        image_url: input.image_url || null
      })
      .returning()
      .execute();

    const result = results[0];
    return {
      ...result,
      price: parseFloat(result.price) // Convert numeric back to number
    };
  } catch (error) {
    console.error('Menu item creation failed:', error);
    throw error;
  }
}

export async function updateMenuItem(input: UpdateMenuItemInput): Promise<MenuItem> {
  try {
    // Verify menu item exists
    const existingResults = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, input.id))
      .execute();

    if (existingResults.length === 0) {
      throw new Error('Menu item not found');
    }

    // If category_id is being updated, verify new category exists and is active
    if (input.category_id !== undefined) {
      const categoryResults = await db.select()
        .from(categoriesTable)
        .where(and(
          eq(categoriesTable.id, input.category_id),
          eq(categoriesTable.is_active, true)
        ))
        .execute();

      if (categoryResults.length === 0) {
        throw new Error('Category not found or inactive');
      }
    }

    // Build update values object
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    if (input.price !== undefined) {
      updateValues.price = input.price.toString(); // Convert number to string for numeric column
    }
    if (input.category_id !== undefined) {
      updateValues.category_id = input.category_id;
    }
    if (input.is_available !== undefined) {
      updateValues.is_available = input.is_available;
    }
    if (input.image_url !== undefined) {
      updateValues.image_url = input.image_url;
    }

    const results = await db.update(menuItemsTable)
      .set(updateValues)
      .where(eq(menuItemsTable.id, input.id))
      .returning()
      .execute();

    const result = results[0];
    return {
      ...result,
      price: parseFloat(result.price) // Convert numeric back to number
    };
  } catch (error) {
    console.error('Menu item update failed:', error);
    throw error;
  }
}

export async function deleteMenuItem(id: number): Promise<boolean> {
  try {
    // Verify menu item exists
    const existingResults = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, id))
      .execute();

    if (existingResults.length === 0) {
      throw new Error('Menu item not found');
    }

    // Soft delete by setting is_available to false
    await db.update(menuItemsTable)
      .set({
        is_available: false,
        updated_at: new Date()
      })
      .where(eq(menuItemsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Menu item deletion failed:', error);
    throw error;
  }
}
