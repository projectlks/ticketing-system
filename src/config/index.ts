interface Config {
  DATABASE_URL: string;
  EMAIL_SERVER_HOST: string;
  EMAIL_SERVER_PORT: string;
  EMAIL_SERVER_USER: string;
  EMAIL_SERVER_PASS: string;
  EMAIL_FROM: string;
}

export const config: Config = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || '',
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || '',
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER || '',
  EMAIL_SERVER_PASS: process.env.EMAIL_SERVER_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
};
