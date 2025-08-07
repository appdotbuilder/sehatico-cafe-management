
import { db } from '../db';
import { transactionsTable, transactionItemsTable, usersTable, menuItemsTable } from '../db/schema';
import { type Transaction, type CreateTransactionInput, type TransactionWithItems } from '../schema';
import { eq, gte, lte, and, desc, sum, count } from 'drizzle-orm';

export async function getTransactions(limit?: number, offset?: number): Promise<TransactionWithItems[]> {
  try {
    // Build base query with joins
    const baseQuery = db.select({
      // Transaction fields
      id: transactionsTable.id,
      transaction_date: transactionsTable.transaction_date,
      customer_name: transactionsTable.customer_name,
      customer_phone: transactionsTable.customer_phone,
      subtotal: transactionsTable.subtotal,
      tax_amount: transactionsTable.tax_amount,
      discount_amount: transactionsTable.discount_amount,
      total_amount: transactionsTable.total_amount,
      payment_method: transactionsTable.payment_method,
      payment_received: transactionsTable.payment_received,
      change_amount: transactionsTable.change_amount,
      notes: transactionsTable.notes,
      cashier_id: transactionsTable.cashier_id,
      created_at: transactionsTable.created_at,
      // Cashier info
      cashier_full_name: usersTable.full_name
    })
    .from(transactionsTable)
    .innerJoin(usersTable, eq(transactionsTable.cashier_id, usersTable.id))
    .orderBy(desc(transactionsTable.created_at));

    // Execute with pagination parameters
    let transactions;
    if (limit !== undefined && offset !== undefined) {
      transactions = await baseQuery.limit(limit).offset(offset).execute();
    } else if (limit !== undefined) {
      transactions = await baseQuery.limit(limit).execute();
    } else {
      transactions = await baseQuery.execute();
    }

    // Get all transaction items for the found transactions
    let allItems: any[] = [];
    if (transactions.length > 0) {
      allItems = await db.select()
        .from(transactionItemsTable)
        .execute();
    }

    // Group items by transaction_id
    const itemsByTransaction = allItems.reduce((acc, item) => {
      if (!acc[item.transaction_id]) {
        acc[item.transaction_id] = [];
      }
      acc[item.transaction_id].push({
        id: item.id,
        transaction_id: item.transaction_id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        notes: item.notes
      });
      return acc;
    }, {} as Record<number, any[]>);

    // Map to final format
    return transactions.map(transaction => ({
      id: transaction.id,
      transaction_date: transaction.transaction_date,
      customer_name: transaction.customer_name,
      customer_phone: transaction.customer_phone,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_method: transaction.payment_method,
      payment_received: parseFloat(transaction.payment_received),
      change_amount: parseFloat(transaction.change_amount),
      notes: transaction.notes,
      cashier_id: transaction.cashier_id,
      created_at: transaction.created_at,
      items: itemsByTransaction[transaction.id] || [],
      cashier: { full_name: transaction.cashier_full_name }
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
}

export async function getTransactionById(id: number): Promise<TransactionWithItems | null> {
  try {
    // Get transaction with cashier info
    const transactionResult = await db.select({
      id: transactionsTable.id,
      transaction_date: transactionsTable.transaction_date,
      customer_name: transactionsTable.customer_name,
      customer_phone: transactionsTable.customer_phone,
      subtotal: transactionsTable.subtotal,
      tax_amount: transactionsTable.tax_amount,
      discount_amount: transactionsTable.discount_amount,
      total_amount: transactionsTable.total_amount,
      payment_method: transactionsTable.payment_method,
      payment_received: transactionsTable.payment_received,
      change_amount: transactionsTable.change_amount,
      notes: transactionsTable.notes,
      cashier_id: transactionsTable.cashier_id,
      created_at: transactionsTable.created_at,
      cashier_full_name: usersTable.full_name
    })
    .from(transactionsTable)
    .innerJoin(usersTable, eq(transactionsTable.cashier_id, usersTable.id))
    .where(eq(transactionsTable.id, id))
    .execute();

    if (transactionResult.length === 0) {
      return null;
    }

    const transaction = transactionResult[0];

    // Get transaction items
    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, id))
      .execute();

    return {
      id: transaction.id,
      transaction_date: transaction.transaction_date,
      customer_name: transaction.customer_name,
      customer_phone: transaction.customer_phone,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_method: transaction.payment_method,
      payment_received: parseFloat(transaction.payment_received),
      change_amount: parseFloat(transaction.change_amount),
      notes: transaction.notes,
      cashier_id: transaction.cashier_id,
      created_at: transaction.created_at,
      items: items.map(item => ({
        id: item.id,
        transaction_id: item.transaction_id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        notes: item.notes
      })),
      cashier: { full_name: transaction.cashier_full_name }
    };
  } catch (error) {
    console.error('Get transaction by ID failed:', error);
    throw error;
  }
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  try {
    // Calculate change amount
    const changeAmount = input.payment_received - input.total_amount;

    // Start database transaction
    const result = await db.transaction(async (tx) => {
      // Insert transaction
      const transactionResult = await tx.insert(transactionsTable)
        .values({
          customer_name: input.customer_name || null,
          customer_phone: input.customer_phone || null,
          subtotal: input.subtotal.toString(),
          tax_amount: input.tax_amount.toString(),
          discount_amount: input.discount_amount.toString(),
          total_amount: input.total_amount.toString(),
          payment_method: input.payment_method,
          payment_received: input.payment_received.toString(),
          change_amount: changeAmount.toString(),
          notes: input.notes || null,
          cashier_id: input.cashier_id
        })
        .returning()
        .execute();

      const transaction = transactionResult[0];

      // Insert transaction items
      const itemsToInsert = input.items.map(item => ({
        transaction_id: transaction.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price.toString(),
        total_price: (item.quantity * item.unit_price).toString(),
        notes: item.notes || null
      }));

      await tx.insert(transactionItemsTable)
        .values(itemsToInsert)
        .execute();

      return transaction;
    });

    // Convert numeric fields back to numbers
    return {
      id: result.id,
      transaction_date: result.transaction_date,
      customer_name: result.customer_name,
      customer_phone: result.customer_phone,
      subtotal: parseFloat(result.subtotal),
      tax_amount: parseFloat(result.tax_amount),
      discount_amount: parseFloat(result.discount_amount),
      total_amount: parseFloat(result.total_amount),
      payment_method: result.payment_method,
      payment_received: parseFloat(result.payment_received),
      change_amount: parseFloat(result.change_amount),
      notes: result.notes,
      cashier_id: result.cashier_id,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('Create transaction failed:', error);
    throw error;
  }
}

export async function getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<TransactionWithItems[]> {
  try {
    // Get transactions within date range
    const transactions = await db.select({
      id: transactionsTable.id,
      transaction_date: transactionsTable.transaction_date,
      customer_name: transactionsTable.customer_name,
      customer_phone: transactionsTable.customer_phone,
      subtotal: transactionsTable.subtotal,
      tax_amount: transactionsTable.tax_amount,
      discount_amount: transactionsTable.discount_amount,
      total_amount: transactionsTable.total_amount,
      payment_method: transactionsTable.payment_method,
      payment_received: transactionsTable.payment_received,
      change_amount: transactionsTable.change_amount,
      notes: transactionsTable.notes,
      cashier_id: transactionsTable.cashier_id,
      created_at: transactionsTable.created_at,
      cashier_full_name: usersTable.full_name
    })
    .from(transactionsTable)
    .innerJoin(usersTable, eq(transactionsTable.cashier_id, usersTable.id))
    .where(
      and(
        gte(transactionsTable.transaction_date, startDate),
        lte(transactionsTable.transaction_date, endDate)
      )
    )
    .orderBy(desc(transactionsTable.transaction_date))
    .execute();

    if (transactions.length === 0) {
      return [];
    }

    // Get all transaction items for the found transactions
    const transactionIds = transactions.map(t => t.id);
    const allItems = await db.select()
      .from(transactionItemsTable)
      .execute();

    // Group items by transaction_id
    const itemsByTransaction = allItems.reduce((acc, item) => {
      if (transactionIds.includes(item.transaction_id)) {
        if (!acc[item.transaction_id]) {
          acc[item.transaction_id] = [];
        }
        acc[item.transaction_id].push({
          id: item.id,
          transaction_id: item.transaction_id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          notes: item.notes
        });
      }
      return acc;
    }, {} as Record<number, any[]>);

    return transactions.map(transaction => ({
      id: transaction.id,
      transaction_date: transaction.transaction_date,
      customer_name: transaction.customer_name,
      customer_phone: transaction.customer_phone,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_method: transaction.payment_method,
      payment_received: parseFloat(transaction.payment_received),
      change_amount: parseFloat(transaction.change_amount),
      notes: transaction.notes,
      cashier_id: transaction.cashier_id,
      created_at: transaction.created_at,
      items: itemsByTransaction[transaction.id] || [],
      cashier: { full_name: transaction.cashier_full_name }
    }));
  } catch (error) {
    console.error('Get transactions by date range failed:', error);
    throw error;
  }
}

export async function getTransactionsByCashier(cashierId: number): Promise<TransactionWithItems[]> {
  try {
    const transactions = await db.select({
      id: transactionsTable.id,
      transaction_date: transactionsTable.transaction_date,
      customer_name: transactionsTable.customer_name,
      customer_phone: transactionsTable.customer_phone,
      subtotal: transactionsTable.subtotal,
      tax_amount: transactionsTable.tax_amount,
      discount_amount: transactionsTable.discount_amount,
      total_amount: transactionsTable.total_amount,
      payment_method: transactionsTable.payment_method,
      payment_received: transactionsTable.payment_received,
      change_amount: transactionsTable.change_amount,
      notes: transactionsTable.notes,
      cashier_id: transactionsTable.cashier_id,
      created_at: transactionsTable.created_at,
      cashier_full_name: usersTable.full_name
    })
    .from(transactionsTable)
    .innerJoin(usersTable, eq(transactionsTable.cashier_id, usersTable.id))
    .where(eq(transactionsTable.cashier_id, cashierId))
    .orderBy(desc(transactionsTable.transaction_date))
    .execute();

    if (transactions.length === 0) {
      return [];
    }

    // Get all transaction items for the found transactions
    const transactionIds = transactions.map(t => t.id);
    const allItems = await db.select()
      .from(transactionItemsTable)
      .execute();

    // Group items by transaction_id
    const itemsByTransaction = allItems.reduce((acc, item) => {
      if (transactionIds.includes(item.transaction_id)) {
        if (!acc[item.transaction_id]) {
          acc[item.transaction_id] = [];
        }
        acc[item.transaction_id].push({
          id: item.id,
          transaction_id: item.transaction_id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          notes: item.notes
        });
      }
      return acc;
    }, {} as Record<number, any[]>);

    return transactions.map(transaction => ({
      id: transaction.id,
      transaction_date: transaction.transaction_date,
      customer_name: transaction.customer_name,
      customer_phone: transaction.customer_phone,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_method: transaction.payment_method,
      payment_received: parseFloat(transaction.payment_received),
      change_amount: parseFloat(transaction.change_amount),
      notes: transaction.notes,
      cashier_id: transaction.cashier_id,
      created_at: transaction.created_at,
      items: itemsByTransaction[transaction.id] || [],
      cashier: { full_name: transaction.cashier_full_name }
    }));
  } catch (error) {
    console.error('Get transactions by cashier failed:', error);
    throw error;
  }
}

export async function getDailySalesReport(date: Date): Promise<{
  totalSales: number;
  totalTransactions: number;
  averageTransaction: number;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
}> {
  try {
    // Set date range for the entire day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get daily totals
    const dailyTotals = await db.select({
      totalSales: sum(transactionsTable.total_amount),
      totalTransactions: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.transaction_date, startOfDay),
        lte(transactionsTable.transaction_date, endOfDay)
      )
    )
    .execute();

    const totalSales = dailyTotals[0]?.totalSales ? parseFloat(dailyTotals[0].totalSales) : 0;
    const totalTransactions = dailyTotals[0]?.totalTransactions || 0;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Get top selling items
    const topSellingQuery = await db.select({
      name: menuItemsTable.name,
      quantity: sum(transactionItemsTable.quantity),
      revenue: sum(transactionItemsTable.total_price)
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
    .innerJoin(menuItemsTable, eq(transactionItemsTable.menu_item_id, menuItemsTable.id))
    .where(
      and(
        gte(transactionsTable.transaction_date, startOfDay),
        lte(transactionsTable.transaction_date, endOfDay)
      )
    )
    .groupBy(menuItemsTable.id, menuItemsTable.name)
    .orderBy(desc(sum(transactionItemsTable.quantity)))
    .limit(10)
    .execute();

    const topSellingItems = topSellingQuery.map(item => ({
      name: item.name,
      quantity: parseInt(item.quantity || '0'),
      revenue: parseFloat(item.revenue || '0')
    }));

    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      topSellingItems
    };
  } catch (error) {
    console.error('Get daily sales report failed:', error);
    throw error;
  }
}
