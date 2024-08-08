import createMiddleware from "next-intl/middleware";
import { type NextRequest, type NextResponse } from "next/server";

const nextIntlMiddleware = createMiddleware({
    locales: ["en", "tr"],
    defaultLocale: "en",
});

export default function (req: NextRequest): NextResponse {
    return nextIntlMiddleware(req);
}

export const config = {
    // match only internationalized pathnames
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|apple-touch-icon.png|favicon.svg|images/books|icons|manifest).*)'
      ],
};