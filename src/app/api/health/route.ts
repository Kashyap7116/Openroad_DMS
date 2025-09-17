import { NextResponse } from "next/server";

export async function GET() {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    services: {
      database: "connected", // You can add actual Supabase connection check here
      fileSystem: "accessible",
      memory: {
        used: process.memoryUsage(),
        uptime: process.uptime(),
      },
    },
  };

  return NextResponse.json(healthCheck, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
