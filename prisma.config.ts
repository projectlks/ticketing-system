// import 'dotenv/config'
// import { defineConfig, env } from 'prisma/config'

// export default defineConfig({
//   schema: 'prisma/schema.prisma',
//   migrations: {
//     path: 'prisma/migrations',
//   },
//   datasource: {
//     url: env('DATABASE_URL'), // make sure DATABASE_URL is in your .env
//     // optional: shadowDatabaseUrl: env('SHADOW_DB_URL'),
//   },
// })

// import 'dotenv/config';
// import { defineConfig, env } from 'prisma/config';

// export default defineConfig({
//   schema: 'prisma/schema.prisma',
//   migrations: {
//     path: 'prisma/migrations',
//     seed: 'tsx prisma/seed.ts',
//   },
//   datasource: {
//     url: env('DATABASE_URL'),
//   },
// });


// prisma.config.ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Prefer DIRECT TCP via DATABASE_URL
    url: env('DATABASE_URL'),
    // Optionally: shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
})
