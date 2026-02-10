
import Redis from "ioredis";

const redis = new Redis({
    host: "192.168.100.95",
    port: 6379,
    //   username:"kophyo",
    password: "Letmein+123", // username မထည့်ပါ
});

redis.on("error", (err) => {
    console.error("Redis error:", err);
});

export default redis;
