// import { PrismaClient } from "@prisma/client"

// export const prisma = new PrismaClient()


// import { PrismaClient } from "@prisma/client";

// export const prisma = new PrismaClient({
//   adapter: {
//     provider: "postgresql",
//     url: process.env.DATABASE_URL!,
//   },
// });


// import 'dotenv/config'
// import { PrismaClient } from "../generated/prisma/client"
// import { PrismaPg } from '@prisma/adapter-pg';
// // import { PrismaPg } from '../generared/prisma/adapter-pg'

// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL!,
// })

// export const prisma = new PrismaClient({ adapter })


// src/libs/prisma.ts (or wherever your current file is)


// testing prisma client with adapter
// import 'dotenv/config'         // ensure env vars are loaded early
// // import { PrismaClient } from './generated/prisma/client'
// import { PrismaPg } from '@prisma/adapter-pg'
// import { PrismaClient } from '@/generated/prisma/client'

// // validate env var presence in dev for clearer errors:
// if (!process.env.DATABASE_URL) {
//   throw new Error('Missing DATABASE_URL in environment')
// }

// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL,
// })

// export const prisma = new PrismaClient({ adapter })


import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { writeSystemLog } from './logger'; // 🌟 Logger ကို ခေါ်ယူထားပါသည်

// validate env var presence in dev for clearer errors:
if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in environment');
}

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
  });

  return new PrismaClient({ adapter }).$extends({
    query: {
      // 🌟 1. ပုံမှန် Model Operations အားလုံးကို ဖမ်းမည့်အပိုင်း
      $allModels: {
        async $allOperations({ model, operation, args, query }) {

          // ယာယီ DEBUG: Prisma ထဲ ဝင်သမျှ Query အကုန်ထုတ်ကြည့်မည်
          // (Zabbix မှာ Log များလွန်းနေပါက ဤလိုင်းကို ပိတ်ထားနိုင်ပါသည်)
          writeSystemLog("database", `[DB_DEBUG] Table: ${model} | Operation: ${operation}`);

          // အရင်ဆုံး Database ထဲကို တကယ် အလုပ်သွားလုပ်ခိုင်းပါမည်
          const result = await query(args);

          const mutationOperations = [
            'create', 'update', 'delete', 'upsert',
            'createMany', 'updateMany', 'deleteMany'
          ];

          if (mutationOperations.includes(operation)) {
            writeSystemLog("database", `[DB_MUTATION_SUCCESS] Table: ${model} | Operation: ${operation.toUpperCase()} executed successfully.`);

            // Ticket ၏ Status ပြောင်းလဲမှုအား အထူးပြု၍ ဖမ်းမည့်အပိုင်း
            if (model === 'Ticket' && operation === 'update') {
              const safeArgs = args as Record<string, unknown>;
              const dataObj = safeArgs.data as Record<string, unknown> | undefined;

              if (dataObj && dataObj.status) {
                writeSystemLog("database", `[TICKET_STATUS_UPDATED] Ticket status changed to [${String(dataObj.status)}].`);
              }
            }
          }

          return result;
        },
      },

      // 🌟 2. Raw SQL Queries (ဖတ်ရန်) များကို ဖမ်းမည့်အပိုင်း
      async $queryRaw({ args, query }) {
        writeSystemLog("database", `[DB_RAW_QUERY] Direct raw SQL query executed.`);
        return query(args);
      },

      // 🌟 3. Raw SQL Mutations (ပြင်ရန်/ဖျက်ရန်) များကို ဖမ်းမည့်အပိုင်း
      async $executeRaw({ args, query }) {
        writeSystemLog("database", `[DB_RAW_EXECUTE] Direct raw SQL mutation executed successfully.`);
        return query(args);
      },

      // 🌟 4. Unsafe Raw Query သုံးမိပါက သတိပေးရန်
      async $queryRawUnsafe({ args, query }) {
        writeSystemLog("database", `[DB_RAW_UNSAFE_WARNING] An unsafe direct raw SQL query was executed. Proceed with caution.`);
        return query(args);
      },
      async $executeRawUnsafe({ args, query }) {
        writeSystemLog("database", `[DB_RAW_UNSAFE_WARNING] An unsafe direct raw SQL mutation was executed. Proceed with caution.`);
        return query(args);
      }
    },
  });
};

// Global scope တွင် Type သတ်မှတ်ခြင်း
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Global ထဲတွင် ရှိပြီးသားဖြစ်လျှင် အဟောင်းကိုသုံးမည်၊ မရှိသေးလျှင် အသစ်ဆောက်မည်
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Production မဟုတ်လျှင် Hot-reload ဖြစ်တိုင်း Connection အသစ်မဆောက်အောင် Global တွင် သိမ်းထားမည်
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}