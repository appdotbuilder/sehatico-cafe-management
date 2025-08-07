
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'KASIR']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'CARD', 'DIGITAL_WALLET', 'BANK_TRANSFER']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').notNull(),
  full_name: text('full_name').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Menu items table
export const menuItemsTable = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id),
  is_available: boolean('is_available').notNull().default(true),
  image_url: text('image_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  customer_name: text('customer_name'),
  customer_phone: text('customer_phone'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_received: numeric('payment_received', { precision: 10, scale: 2 }).notNull(),
  change_amount: numeric('change_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  cashier_id: integer('cashier_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transaction items table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id),
  menu_item_id: integer('menu_item_id').notNull().references(() => menuItemsTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes')
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  menuItems: many(menuItemsTable)
}));

export const menuItemsRelations = relations(menuItemsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [menuItemsTable.category_id],
    references: [categoriesTable.id]
  }),
  transactionItems: many(transactionItemsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  cashier: one(usersTable, {
    fields: [transactionsTable.cashier_id],
    references: [usersTable.id]
  }),
  items: many(transactionItemsTable)
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id]
  }),
  menuItem: one(menuItemsTable, {
    fields: [transactionItemsTable.menu_item_id],
    references: [menuItemsTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  menuItems: menuItemsTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable
};
