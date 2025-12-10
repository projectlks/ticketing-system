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
import 'dotenv/config'         // ensure env vars are loaded early
// import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// validate env var presence in dev for clearer errors:
if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in environment')
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

export const prisma = new PrismaClient({ adapter })
