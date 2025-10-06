import Redis from "ioredis";

export const createRedisClient = () => {
  const url = process.env.REDIS_URL;
  if (url) {
    return new Redis(url, {
      lazyConnect: true,
      enableReadyCheck: false,
    });
  }

  return new Redis({
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? "6379"),
    lazyConnect: true,
    enableReadyCheck: false,
  });
};

export type RedisClient = ReturnType<typeof createRedisClient>;
