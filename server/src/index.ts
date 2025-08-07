
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema, 
  createUserInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createMenuItemInputSchema,
  updateMenuItemInputSchema,
  createTransactionInputSchema
} from './schema';

// Import handlers
import { loginUser, createUser, initializeDefaultAdmin } from './handlers/auth';
import { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from './handlers/categories';
import { 
  getMenuItems, 
  getMenuItemsByCategory, 
  getMenuItemById, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem 
} from './handlers/menu_items';
import { 
  getTransactions, 
  getTransactionById, 
  createTransaction, 
  getTransactionsByDateRange,
  getTransactionsByCashier,
  getDailySalesReport 
} from './handlers/transactions';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),
  
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
    
  initializeAdmin: publicProcedure
    .mutation(() => initializeDefaultAdmin()),

  // Category routes
  getCategories: publicProcedure
    .query(() => getCategories()),
    
  getCategoryById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCategoryById(input.id)),
    
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
    
  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),
    
  deleteCategory: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCategory(input.id)),

  // Menu item routes
  getMenuItems: publicProcedure
    .query(() => getMenuItems()),
    
  getMenuItemsByCategory: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(({ input }) => getMenuItemsByCategory(input.categoryId)),
    
  getMenuItemById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getMenuItemById(input.id)),
    
  createMenuItem: publicProcedure
    .input(createMenuItemInputSchema)
    .mutation(({ input }) => createMenuItem(input)),
    
  updateMenuItem: publicProcedure
    .input(updateMenuItemInputSchema)
    .mutation(({ input }) => updateMenuItem(input)),
    
  deleteMenuItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteMenuItem(input.id)),

  // Transaction routes
  getTransactions: publicProcedure
    .input(z.object({ 
      limit: z.number().optional(), 
      offset: z.number().optional() 
    }).optional())
    .query(({ input }) => getTransactions(input?.limit, input?.offset)),
    
  getTransactionById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTransactionById(input.id)),
    
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
    
  getTransactionsByDateRange: publicProcedure
    .input(z.object({ 
      startDate: z.coerce.date(), 
      endDate: z.coerce.date() 
    }))
    .query(({ input }) => getTransactionsByDateRange(input.startDate, input.endDate)),
    
  getTransactionsByCashier: publicProcedure
    .input(z.object({ cashierId: z.number() }))
    .query(({ input }) => getTransactionsByCashier(input.cashierId)),
    
  getDailySalesReport: publicProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(({ input }) => getDailySalesReport(input.date)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  
  // Initialize default admin user on startup
  try {
    await initializeDefaultAdmin();
    console.log('Default admin user initialized');
  } catch (error) {
    console.log('Admin user already exists or initialization failed');
  }
  
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`SEHATI_KAFE TRPC server listening at port: ${port}`);
}

start();
