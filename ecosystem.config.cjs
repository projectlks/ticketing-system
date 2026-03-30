const cwd = "/usr/local/openresty/nginx/conf/ticketing-system";

const baseApp = {
  cwd,
  autorestart: true,
  watch: false,
  max_restarts: 20,
  min_uptime: "10s",
  restart_delay: 3000,
  kill_timeout: 5000,
  time: true,
  env: {
    NODE_ENV: "production",
  },
};

module.exports = {
  apps: [
    {
      ...baseApp,
      name: "ticketing-web",
      script: "npm",
      // Next.js ကို IPv4 interfaces အားလုံးမှာ bind လုပ်ဖို့ -H 0.0.0.0 ထည့်ထားပါတယ်
      args: "run start -- -H 0.0.0.0 -p 3000",
    },
    {
      ...baseApp,
      name: "ticketing-socket",
      script: "npm",
      args: "run start:socket",
    },
    {
      ...baseApp,
      name: "ticketing-cron",
      script: "npm",
      args: "run start:cron",
    },
  ],
};
