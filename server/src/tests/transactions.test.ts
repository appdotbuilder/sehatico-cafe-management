
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, menuItemsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { eq } from 'drizzle-orm';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  getTransactionsByDateRange,
  getTransactionsByCashier,
  getDailySalesReport
} from '../handlers/transactions';

describe('Transaction Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create test user (cashier)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        password: 'password123',
        role: 'KASIR',
        full_name: 'Test Cashier'
      })
      .returning()
      .execute();
    
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create test menu items
    const menuItemResults = await db.insert(menuItemsTable)
      .values([
        {
          name: 'Test Item 1',
          description: 'Test item 1 description',
          price: '15.50',
          category_id: categoryResult[0].id
        },
        {
          name: 'Test Item 2',
          description: 'Test item 2 description',
          price: '25.00',
          category_id: categoryResult[0].id
        }
      ])
      .returning()
      .execute();

    return {
      cashier: userResult[0],
      category: categoryResult[0],
      menuItems: menuItemResults
    };
  };

  describe('createTransaction', () => {
    it('should create a transaction with items', async () => {
      const testData = await createTestData();

      const input: CreateTransactionInput = {
        customer_name: 'John Doe',
        customer_phone: '081234567890',
        items: [
          {
            menu_item_id: testData.menuItems[0].id,
            quantity: 2,
            unit_price: 15.50,
            notes: 'Extra spicy'
          },
          {
            menu_item_id: testData.menuItems[1].id,
            quantity: 1,
            unit_price: 25.00
          }
        ],
        subtotal: 56.00,
        tax_amount: 5.60,
        discount_amount: 0,
        total_amount: 61.60,
        payment_method: 'CASH',
        payment_received: 70.00,
        cashier_id: testData.cashier.id
      };

      const result = await createTransaction(input);

      expect(result.id).toBeDefined();
      expect(result.customer_name).toEqual('John Doe');
      expect(result.customer_phone).toEqual('081234567890');
      expect(result.subtotal).toEqual(56.00);
      expect(result.tax_amount).toEqual(5.60);
      expect(result.discount_amount).toEqual(0);
      expect(result.total_amount).toEqual(61.60);
      expect(result.payment_method).toEqual('CASH');
      expect(result.payment_received).toEqual(70.00);
      expect(result.change_amount).toEqual(8.40); // 70.00 - 61.60
      expect(result.cashier_id).toEqual(testData.cashier.id);
      expect(result.transaction_date).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create transaction items correctly', async () => {
      const testData = await createTestData();

      const input: CreateTransactionInput = {
        items: [
          {
            menu_item_id: testData.menuItems[0].id,
            quantity: 3,
            unit_price: 15.50
          }
        ],
        subtotal: 46.50,
        tax_amount: 4.65,
        discount_amount: 0,
        total_amount: 51.15,
        payment_method: 'CARD',
        payment_received: 51.15,
        cashier_id: testData.cashier.id
      };

      const transaction = await createTransaction(input);

      // Verify transaction items were created
      const items = await db.select()
        .from(transactionItemsTable)
        .where(eq(transactionItemsTable.transaction_id, transaction.id))
        .execute();

      expect(items).toHaveLength(1);
      expect(items[0].menu_item_id).toEqual(testData.menuItems[0].id);
      expect(items[0].quantity).toEqual(3);
      expect(parseFloat(items[0].unit_price)).toEqual(15.50);
      expect(parseFloat(items[0].total_price)).toEqual(46.50); // 3 * 15.50
    });

    it('should handle transaction without customer info', async () => {
      const testData = await createTestData();

      const input: CreateTransactionInput = {
        items: [
          {
            menu_item_id: testData.menuItems[0].id,
            quantity: 1,
            unit_price: 15.50
          }
        ],
        subtotal: 15.50,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 15.50,
        payment_method: 'CASH',
        payment_received: 20.00,
        cashier_id: testData.cashier.id
      };

      const result = await createTransaction(input);

      expect(result.customer_name).toBeNull();
      expect(result.customer_phone).toBeNull();
      expect(result.notes).toBeNull();
      expect(result.change_amount).toEqual(4.50);
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction with items and cashier info', async () => {
      const testData = await createTestData();

      // Create a transaction first
      const input: CreateTransactionInput = {
        customer_name: 'Jane Smith',
        items: [
          {
            menu_item_id: testData.menuItems[0].id,
            quantity: 1,
            unit_price: 15.50
          }
        ],
        subtotal: 15.50,
        tax_amount: 1.55,
        discount_amount: 0,
        total_amount: 17.05,
        payment_method: 'DIGITAL_WALLET',
        payment_received: 17.05,
        cashier_id: testData.cashier.id
      };

      const createdTransaction = await createTransaction(input);
      const result = await getTransactionById(createdTransaction.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdTransaction.id);
      expect(result!.customer_name).toEqual('Jane Smith');
      expect(result!.total_amount).toEqual(17.05);
      expect(result!.payment_method).toEqual('DIGITAL_WALLET');
      expect(result!.cashier.full_name).toEqual('Test Cashier');
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].quantity).toEqual(1);
      expect(result!.items[0].unit_price).toEqual(15.50);
    });

    it('should return null for non-existent transaction', async () => {
      const result = await getTransactionById(99999);
      expect(result).toBeNull();
    });
  });

  describe('getTransactions', () => {
    it('should return all transactions with pagination', async () => {
      const testData = await createTestData();

      // Create multiple transactions
      const inputs = [
        {
          items: [{ menu_item_id: testData.menuItems[0].id, quantity: 1, unit_price: 15.50 }],
          subtotal: 15.50,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 15.50,
          payment_method: 'CASH' as const,
          payment_received: 20.00,
          cashier_id: testData.cashier.id
        },
        {
          items: [{ menu_item_id: testData.menuItems[1].id, quantity: 1, unit_price: 25.00 }],
          subtotal: 25.00,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 25.00,
          payment_method: 'CARD' as const,
          payment_received: 25.00,
          cashier_id: testData.cashier.id
        }
      ];

      await Promise.all(inputs.map(input => createTransaction(input)));

      // Test without pagination
      const allTransactions = await getTransactions();
      expect(allTransactions).toHaveLength(2);
      expect(allTransactions[0].cashier.full_name).toEqual('Test Cashier');

      // Test with limit
      const limitedTransactions = await getTransactions(1);
      expect(limitedTransactions).toHaveLength(1);

      // Test with offset
      const offsetTransactions = await getTransactions(1, 1);
      expect(offsetTransactions).toHaveLength(1);
      expect(offsetTransactions[0].id).not.toEqual(limitedTransactions[0].id);
    });

    it('should return empty array when no transactions exist', async () => {
      const result = await getTransactions();
      expect(result).toHaveLength(0);
    });
  });

  describe('getTransactionsByDateRange', () => {
    it('should return transactions within date range', async () => {
      const testData = await createTestData();

      // Create transaction
      const input: CreateTransactionInput = {
        items: [{ menu_item_id: testData.menuItems[0].id, quantity: 1, unit_price: 15.50 }],
        subtotal: 15.50,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 15.50,
        payment_method: 'CASH',
        payment_received: 20.00,
        cashier_id: testData.cashier.id
      };

      await createTransaction(input);

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Should find transaction created today
      const todaysTransactions = await getTransactionsByDateRange(yesterday, tomorrow);
      expect(todaysTransactions).toHaveLength(1);
      expect(todaysTransactions[0].total_amount).toEqual(15.50);

      // Should not find transactions outside range
      const futureTransactions = await getTransactionsByDateRange(tomorrow, new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000));
      expect(futureTransactions).toHaveLength(0);
    });
  });

  describe('getTransactionsByCashier', () => {
    it('should return transactions for specific cashier', async () => {
      const testData = await createTestData();

      // Create second cashier
      const cashier2 = await db.insert(usersTable)
        .values({
          username: 'cashier2',
          password: 'password123',
          role: 'KASIR',
          full_name: 'Second Cashier'
        })
        .returning()
        .execute();

      // Create transactions for different cashiers
      const input1: CreateTransactionInput = {
        items: [{ menu_item_id: testData.menuItems[0].id, quantity: 1, unit_price: 15.50 }],
        subtotal: 15.50,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 15.50,
        payment_method: 'CASH',
        payment_received: 20.00,
        cashier_id: testData.cashier.id
      };

      const input2: CreateTransactionInput = {
        items: [{ menu_item_id: testData.menuItems[1].id, quantity: 1, unit_price: 25.00 }],
        subtotal: 25.00,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 25.00,
        payment_method: 'CARD',
        payment_received: 25.00,
        cashier_id: cashier2[0].id
      };

      await createTransaction(input1);
      await createTransaction(input2);

      // Get transactions for first cashier
      const cashier1Transactions = await getTransactionsByCashier(testData.cashier.id);
      expect(cashier1Transactions).toHaveLength(1);
      expect(cashier1Transactions[0].cashier.full_name).toEqual('Test Cashier');
      expect(cashier1Transactions[0].total_amount).toEqual(15.50);

      // Get transactions for second cashier
      const cashier2Transactions = await getTransactionsByCashier(cashier2[0].id);
      expect(cashier2Transactions).toHaveLength(1);
      expect(cashier2Transactions[0].cashier.full_name).toEqual('Second Cashier');
      expect(cashier2Transactions[0].total_amount).toEqual(25.00);
    });

    it('should return empty array for cashier with no transactions', async () => {
      const testData = await createTestData();
      const result = await getTransactionsByCashier(testData.cashier.id);
      expect(result).toHaveLength(0);
    });
  });

  describe('getDailySalesReport', () => {
    it('should generate correct daily sales report', async () => {
      const testData = await createTestData();

      // Create transactions for today
      const inputs: CreateTransactionInput[] = [
        {
          items: [
            { menu_item_id: testData.menuItems[0].id, quantity: 2, unit_price: 15.50 },
            { menu_item_id: testData.menuItems[1].id, quantity: 1, unit_price: 25.00 }
          ],
          subtotal: 56.00,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 56.00,
          payment_method: 'CASH',
          payment_received: 60.00,
          cashier_id: testData.cashier.id
        },
        {
          items: [
            { menu_item_id: testData.menuItems[0].id, quantity: 1, unit_price: 15.50 }
          ],
          subtotal: 15.50,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 15.50,
          payment_method: 'CARD',
          payment_received: 15.50,
          cashier_id: testData.cashier.id
        }
      ];

      await Promise.all(inputs.map(input => createTransaction(input)));

      const today = new Date();
      const report = await getDailySalesReport(today);

      expect(report.totalSales).toEqual(71.50); // 56.00 + 15.50
      expect(report.totalTransactions).toEqual(2);
      expect(report.averageTransaction).toEqual(35.75); // 71.50 / 2
      expect(report.topSellingItems).toHaveLength(2);
      
      // Test Item 1 should be top selling (3 total quantity)
      const topItem = report.topSellingItems[0];
      expect(topItem.name).toEqual('Test Item 1');
      expect(topItem.quantity).toEqual(3); // 2 + 1
      expect(topItem.revenue).toEqual(46.50); // (2 * 15.50) + (1 * 15.50)

      // Test Item 2 should be second
      const secondItem = report.topSellingItems[1];
      expect(secondItem.name).toEqual('Test Item 2');
      expect(secondItem.quantity).toEqual(1);
      expect(secondItem.revenue).toEqual(25.00);
    });

    it('should handle empty sales report', async () => {
      const today = new Date();
      const report = await getDailySalesReport(today);

      expect(report.totalSales).toEqual(0);
      expect(report.totalTransactions).toEqual(0);
      expect(report.averageTransaction).toEqual(0);
      expect(report.topSellingItems).toHaveLength(0);
    });

    it('should only include transactions from specified date', async () => {
      const testData = await createTestData();

      // Create transaction today
      const input: CreateTransactionInput = {
        items: [{ menu_item_id: testData.menuItems[0].id, quantity: 1, unit_price: 15.50 }],
        subtotal: 15.50,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 15.50,
        payment_method: 'CASH',
        payment_received: 20.00,
        cashier_id: testData.cashier.id
      };

      await createTransaction(input);

      // Get report for yesterday (should be empty)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayReport = await getDailySalesReport(yesterday);

      expect(yesterdayReport.totalSales).toEqual(0);
      expect(yesterdayReport.totalTransactions).toEqual(0);

      // Get report for today (should have data)
      const today = new Date();
      const todayReport = await getDailySalesReport(today);

      expect(todayReport.totalSales).toEqual(15.50);
      expect(todayReport.totalTransactions).toEqual(1);
    });
  });
});
