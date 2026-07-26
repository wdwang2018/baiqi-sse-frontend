import { auth } from "@/lib/auth";

export default auth;

export const config = {
  matcher: [
    // Protect all dashboard routes except auth & API
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
