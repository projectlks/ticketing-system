// interface Config {
//   DATABASE_URL: string;
//   EMAIL_SERVER_HOST: string;
//   EMAIL_SERVER_PORT: string;
//   EMAIL_SERVER_USER: string;
//   EMAIL_SERVER_PASS: string;
//   EMAIL_FROM: string;

//   // testing
//   CLIENT_ID: string;
//   CLIENT_SECRET: string;
// }

// export const config: Config = {
//   DATABASE_URL: process.env.DATABASE_URL || '',
//   EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || '',
//   EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || '',
//   EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER || '',
//   EMAIL_SERVER_PASS: process.env.EMAIL_SERVER_PASS || '',
//   EMAIL_FROM: process.env.EMAIL_FROM || '',

//     // testing

//   CLIENT_ID: process.env.CLIENT_ID || '',
//   CLIENT_SECRET: process.env.CLIENT_SECRET || '',
// };


interface Config {
  DATABASE_URL: string;
  EMAIL_SERVER_HOST: string;
  EMAIL_SERVER_PORT: string;
  EMAIL_SERVER_USER: string;
  EMAIL_SERVER_PASS: string;
  EMAIL_FROM: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

export const config: Config = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || '',
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || '',
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER || '',
  EMAIL_SERVER_PASS: process.env.EMAIL_SERVER_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  CLIENT_ID: process.env.CLIENT_ID || '',
  CLIENT_SECRET: process.env.CLIENT_SECRET || '',
};
