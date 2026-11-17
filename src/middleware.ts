import { NextResponse, type NextRequest } from "next/server";

// Cheap first gate only: no staff cookie → login page. Full verification (signature, DB status,
// session version, permissions) happens server-side in every admin page and action.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const open = pathname === "/admin/login" || pathname.startsWith("/admin/invite/");
  if (!open && !req.cookies.get("verda_staff")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
