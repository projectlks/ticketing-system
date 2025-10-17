import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ===== Users =====
  const adminPassword = await bcrypt.hash("QwertyuioP@123!@#", 10);

  await prisma.user.upsert({
    where: { email: "support@eastwindmyanmar.com.mm" },
    update: {},
    create: {
      name: "Super Admin",
      email: "support@eastwindmyanmar.com.mm",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  });

  // console.log("✅ Essential seed data inserted!");

  // check if mail setting already exists
  const existing = await prisma.mailSetting.findFirst();
  if (!existing) {
    await prisma.mailSetting.create({
      data: {
        emails: ["support@eastwindmyanmar.com.mm"], // default support email
      },
    });
    console.log("✅ MailSetting seeded successfully");
  } else {
    console.log("ℹ️ MailSetting already exists, skipping seeding");
  }

  await prisma.sLA.createMany({
    data: [
      {
      priority: "CRITICAL",
        responseTime: 30, // 30 min
        resolutionTime: 120, // 2 hours
        rcaTime: 7, // 7 days
        availability: "7*24",
      },
      {
        priority: "MAJOR",
        responseTime: 120, // 2 hours
        resolutionTime: 240, // 4 hours
        rcaTime: 10, // 10 days
        availability: "7*24",
      },
      {
        priority: "MINOR",
        responseTime: 240, // 4 hours
        resolutionTime: 1440, // 24 hours
        rcaTime: 10, // 10 working days
        availability: "7*24",
      },
      {
        priority: "REQUEST",
        responseTime: 480, // 8 hours
        resolutionTime: 43200, // 30 days
        availability: "5*8",
      },
    ],
  });


  //   await prisma.logs.createMany({
  //   data: [
  //     {
  //       datetime: new Date("2025-10-10T08:30:00Z"),
  //       recoveryTime: new Date("2025-10-10T09:15:00Z"),
  //       status: "Resolved",
  //       host: "web-server-01",
  //       description: "High CPU usage detected and auto-scaled successfully.",
  //       problemSeverity: "Critical",
  //       duration: "45 mins",
  //       contact: "admin@eastwindmyanmar.com.mm",
  //       remark: "Auto-scaling resolved the issue.",
  //     },
  //     {
  //       datetime: new Date("2025-10-11T10:00:00Z"),
  //       recoveryTime: new Date("2025-10-11T11:00:00Z"),
  //       status: "Resolved",
  //       host: "db-server-02",
  //       description: "Database latency issue caused by heavy read load.",
  //       problemSeverity: "Major",
  //       duration: "1 hour",
  //       contact: "dba@eastwindmyanmar.com.mm",
  //       remark: "Added read replica for load balancing.",
  //     },
  //     {
  //       datetime: new Date("2025-10-12T13:00:00Z"),
  //       recoveryTime: null,
  //       status: "In Progress",
  //       host: "api-gateway-01",
  //       description: "API timeout errors observed from client apps.",
  //       problemSeverity: "Minor",
  //       duration: "Ongoing",
  //       contact: "devops@eastwindmyanmar.com.mm",
  //       remark: "Investigating issue with load balancer.",
  //     },
  //     {
  //       datetime: new Date("2025-10-13T15:45:00Z"),
  //       recoveryTime: new Date("2025-10-13T16:00:00Z"),
  //       status: "Resolved",
  //       host: "auth-service",
  //       description: "Temporary login failure due to cache sync issue.",
  //       problemSeverity: "Request",
  //       duration: "15 mins",
  //       contact: "support@eastwindmyanmar.com.mm",
  //       remark: "Cache invalidated and restarted successfully.",
  //     },
  //     {
  //       datetime: new Date("2025-10-14T07:15:00Z"),
  //       recoveryTime: null,
  //       status: "Open",
  //       host: "monitoring-agent-02",
  //       description: "Missing heartbeat signal for the monitoring agent.",
  //       problemSeverity: "Major",
  //       duration: "Pending",
  //       contact: "itops@eastwindmyanmar.com.mm",
  //       remark: "Reinstalling monitoring agent.",
  //     },
  //        {
  //       datetime: new Date("2025-10-10T08:30:00Z"),
  //       recoveryTime: new Date("2025-10-10T09:15:00Z"),
  //       status: "Resolved",
  //       host: "web-server-01",
  //       description: "High CPU usage detected and auto-scaled successfully.",
  //       problemSeverity: "Critical",
  //       duration: "45 mins",
  //       contact: "admin@eastwindmyanmar.com.mm",
  //       remark: "Auto-scaling resolved the issue.",
  //     },
  //     {
  //       datetime: new Date("2025-10-11T10:00:00Z"),
  //       recoveryTime: new Date("2025-10-11T11:00:00Z"),
  //       status: "Resolved",
  //       host: "db-server-02",
  //       description: "Database latency issue caused by heavy read load.",
  //       problemSeverity: "Major",
  //       duration: "1 hour",
  //       contact: "dba@eastwindmyanmar.com.mm",
  //       remark: "Added read replica for load balancing.",
  //     },
  //     {
  //       datetime: new Date("2025-10-12T13:00:00Z"),
  //       recoveryTime: null,
  //       status: "In Progress",
  //       host: "api-gateway-01",
  //       description: "API timeout errors observed from client apps.",
  //       problemSeverity: "Minor",
  //       duration: "Ongoing",
  //       contact: "devops@eastwindmyanmar.com.mm",
  //       remark: "Investigating issue with load balancer.",
  //     },
  //     {
  //       datetime: new Date("2025-10-13T15:45:00Z"),
  //       recoveryTime: new Date("2025-10-13T16:00:00Z"),
  //       status: "Resolved",
  //       host: "auth-service",
  //       description: "Temporary login failure due to cache sync issue.",
  //       problemSeverity: "Request",
  //       duration: "15 mins",
  //       contact: "support@eastwindmyanmar.com.mm",
  //       remark: "Cache invalidated and restarted successfully.",
  //     },
  //     {
  //       datetime: new Date("2025-10-14T07:15:00Z"),
  //       recoveryTime: null,
  //       status: "Open",
  //       host: "monitoring-agent-02",
  //       description: "Missing heartbeat signal for the monitoring agent.",
  //       problemSeverity: "Major",
  //       duration: "Pending",
  //       contact: "itops@eastwindmyanmar.com.mm",
  //       remark: "Reinstalling monitoring agent.",
  //     },
  //        {
  //       datetime: new Date("2025-10-10T08:30:00Z"),
  //       recoveryTime: new Date("2025-10-10T09:15:00Z"),
  //       status: "Resolved",
  //       host: "web-server-01",
  //       description: "High CPU usage detected and auto-scaled successfully.",
  //       problemSeverity: "Critical",
  //       duration: "45 mins",
  //       contact: "admin@eastwindmyanmar.com.mm",
  //       remark: "Auto-scaling resolved the issue.",
  //     },
  //     {
  //       datetime: new Date("2025-10-11T10:00:00Z"),
  //       recoveryTime: new Date("2025-10-11T11:00:00Z"),
  //       status: "Resolved",
  //       host: "db-server-02",
  //       description: "Database latency issue caused by heavy read load.",
  //       problemSeverity: "Major",
  //       duration: "1 hour",
  //       contact: "dba@eastwindmyanmar.com.mm",
  //       remark: "Added read replica for load balancing.",
  //     },
  //     {
  //       datetime: new Date("2025-10-12T13:00:00Z"),
  //       recoveryTime: null,
  //       status: "In Progress",
  //       host: "api-gateway-01",
  //       description: "API timeout errors observed from client apps.",
  //       problemSeverity: "Minor",
  //       duration: "Ongoing",
  //       contact: "devops@eastwindmyanmar.com.mm",
  //       remark: "Investigating issue with load balancer.",
  //     },
  //     {
  //       datetime: new Date("2025-10-13T15:45:00Z"),
  //       recoveryTime: new Date("2025-10-13T16:00:00Z"),
  //       status: "Resolved",
  //       host: "auth-service",
  //       description: "Temporary login failure due to cache sync issue.",
  //       problemSeverity: "Request",
  //       duration: "15 mins",
  //       contact: "support@eastwindmyanmar.com.mm",
  //       remark: "Cache invalidated and restarted successfully.",
  //     },
  //     {
  //       datetime: new Date("2025-10-14T07:15:00Z"),
  //       recoveryTime: null,
  //       status: "Open",
  //       host: "monitoring-agent-02",
  //       description: "Missing heartbeat signal for the monitoring agent.",
  //       problemSeverity: "Major",
  //       duration: "Pending",
  //       contact: "itops@eastwindmyanmar.com.mm",
  //       remark: "Reinstalling monitoring agent.",
  //     },
  //        {
  //       datetime: new Date("2025-10-10T08:30:00Z"),
  //       recoveryTime: new Date("2025-10-10T09:15:00Z"),
  //       status: "Resolved",
  //       host: "web-server-01",
  //       description: "High CPU usage detected and auto-scaled successfully.",
  //       problemSeverity: "Critical",
  //       duration: "45 mins",
  //       contact: "admin@eastwindmyanmar.com.mm",
  //       remark: "Auto-scaling resolved the issue.",
  //     },
  //     {
  //       datetime: new Date("2025-10-11T10:00:00Z"),
  //       recoveryTime: new Date("2025-10-11T11:00:00Z"),
  //       status: "Resolved",
  //       host: "db-server-02",
  //       description: "Database latency issue caused by heavy read load.",
  //       problemSeverity: "Major",
  //       duration: "1 hour",
  //       contact: "dba@eastwindmyanmar.com.mm",
  //       remark: "Added read replica for load balancing.",
  //     },
  //     {
  //       datetime: new Date("2025-10-12T13:00:00Z"),
  //       recoveryTime: null,
  //       status: "In Progress",
  //       host: "api-gateway-01",
  //       description: "API timeout errors observed from client apps.",
  //       problemSeverity: "Minor",
  //       duration: "Ongoing",
  //       contact: "devops@eastwindmyanmar.com.mm",
  //       remark: "Investigating issue with load balancer.",
  //     },
  //     {
  //       datetime: new Date("2025-10-13T15:45:00Z"),
  //       recoveryTime: new Date("2025-10-13T16:00:00Z"),
  //       status: "Resolved",
  //       host: "auth-service",
  //       description: "Temporary login failure due to cache sync issue.",
  //       problemSeverity: "Request",
  //       duration: "15 mins",
  //       contact: "support@eastwindmyanmar.com.mm",
  //       remark: "Cache invalidated and restarted successfully.",
  //     },
  //     {
  //       datetime: new Date("2025-10-14T07:15:00Z"),
  //       recoveryTime: null,
  //       status: "Open",
  //       host: "monitoring-agent-02",
  //       description: "Missing heartbeat signal for the monitoring agent.",
  //       problemSeverity: "Major",
  //       duration: "Pending",
  //       contact: "itops@eastwindmyanmar.com.mm",
  //       remark: "Reinstalling monitoring agent.",
  //     },
  //        {
  //       datetime: new Date("2025-10-10T08:30:00Z"),
  //       recoveryTime: new Date("2025-10-10T09:15:00Z"),
  //       status: "Resolved",
  //       host: "web-server-01",
  //       description: "High CPU usage detected and auto-scaled successfully.",
  //       problemSeverity: "Critical",
  //       duration: "45 mins",
  //       contact: "admin@eastwindmyanmar.com.mm",
  //       remark: "Auto-scaling resolved the issue.",
  //     },
  //     {
  //       datetime: new Date("2025-10-11T10:00:00Z"),
  //       recoveryTime: new Date("2025-10-11T11:00:00Z"),
  //       status: "Resolved",
  //       host: "db-server-02",
  //       description: "Database latency issue caused by heavy read load.",
  //       problemSeverity: "Major",
  //       duration: "1 hour",
  //       contact: "dba@eastwindmyanmar.com.mm",
  //       remark: "Added read replica for load balancing.",
  //     },
  //     {
  //       datetime: new Date("2025-10-12T13:00:00Z"),
  //       recoveryTime: null,
  //       status: "In Progress",
  //       host: "api-gateway-01",
  //       description: "API timeout errors observed from client apps.",
  //       problemSeverity: "Minor",
  //       duration: "Ongoing",
  //       contact: "devops@eastwindmyanmar.com.mm",
  //       remark: "Investigating issue with load balancer.",
  //     },
  //     {
  //       datetime: new Date("2025-10-13T15:45:00Z"),
  //       recoveryTime: new Date("2025-10-13T16:00:00Z"),
  //       status: "Resolved",
  //       host: "auth-service",
  //       description: "Temporary login failure due to cache sync issue.",
  //       problemSeverity: "Request",
  //       duration: "15 mins",
  //       contact: "support@eastwindmyanmar.com.mm",
  //       remark: "Cache invalidated and restarted successfully.",
  //     },
  //     {
  //       datetime: new Date("2025-10-14T07:15:00Z"),
  //       recoveryTime: null,
  //       status: "Open",
  //       host: "monitoring-agent-02",
  //       description: "Missing heartbeat signal for the monitoring agent.",
  //       problemSeverity: "Major",
  //       duration: "Pending",
  //       contact: "itops@eastwindmyanmar.com.mm",
  //       remark: "Reinstalling monitoring agent.",
  //     },
  //   ],
  // });

  console.log("✅ Seed data inserted successfully!");

}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
