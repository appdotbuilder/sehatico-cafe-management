
import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['ADMIN', 'KASIR']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  role: userRoleSchema,
  full_name: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type User = z.infer<typeof userSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type Category = z.infer<typeof categorySchema>;

// Menu item schema
export const menuItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  category_id: z.number(),
  is_available: z.boolean(),
  image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type MenuItem = z.infer<typeof menuItemSchema>;

// Payment methods enum
export const paymentMethodSchema = z.enum(['CASH', 'CARD', 'DIGITAL_WALLET', 'BANK_TRANSFER']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  transaction_date: z.coerce.date(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  total_amount: z.number(),
  payment_method: paymentMethodSchema,
  payment_received: z.number(),
  change_amount: z.number(),
  notes: z.string().nullable(),
  cashier_id: z.number(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Transaction item schema
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  menu_item_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  notes: z.string().nullable()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Input schemas for user operations
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: userRoleSchema,
  full_name: z.string().min(2)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Input schemas for category operations
export const createCategoryInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Input schemas for menu item operations
export const createMenuItemInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  category_id: z.number(),
  image_url: z.string().nullable().optional()
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;

export const updateMenuItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  category_id: z.number().optional(),
  is_available: z.boolean().optional(),
  image_url: z.string().nullable().optional()
});

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;

// Input schemas for transaction operations
export const transactionItemInputSchema = z.object({
  menu_item_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  notes: z.string().nullable().optional()
});

export type TransactionItemInput = z.infer<typeof transactionItemInputSchema>;

export const createTransactionInputSchema = z.object({
  customer_name: z.string().nullable().optional(),
  customer_phone: z.string().nullable().optional(),
  items: z.array(transactionItemInputSchema).min(1),
  subtotal: z.number().positive(),
  tax_amount: z.number().nonnegative(),
  discount_amount: z.number().nonnegative(),
  total_amount: z.number().positive(),
  payment_method: paymentMethodSchema,
  payment_received: z.number().positive(),
  notes: z.string().nullable().optional(),
  cashier_id: z.number()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Response schemas
export const loginResponseSchema = z.object({
  user: userSchema.omit({ password: true }),
  token: z.string()
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const transactionWithItemsSchema = transactionSchema.extend({
  items: z.array(transactionItemSchema),
  cashier: userSchema.pick({ full_name: true })
});

export type TransactionWithItems = z.infer<typeof transactionWithItemsSchema>;

export const menuItemWithCategorySchema = menuItemSchema.extend({
  category: categorySchema.pick({ name: true })
});

export type MenuItemWithCategory = z.infer<typeof menuItemWithCategorySchema>;
