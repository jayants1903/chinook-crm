import { useSession } from "@tanstack/react-start/server";

export type AdminSessionData = {
  userId?: string;
  email?: string;
};

const DEV_FALLBACK_SECRET =
  "dev-insecure-admin-session-secret-please-change-me-in-production-0123456789";

export function adminSessionConfig() {
  const envSecret = process.env.ADMIN_SESSION_SECRET;
  const password =
    envSecret && envSecret.length >= 32 ? envSecret : DEV_FALLBACK_SECRET;


  return {
    password,
    name: "chinook_admin_session",
    maxAge: 60 * 60 * 8, // 8 hours
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: true,
      path: "/",
    },
  };
}

export async function getAdminSession() {
  return useSession<AdminSessionData>(adminSessionConfig());
}
