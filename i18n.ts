import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

const locales = ["en", "tr"];

export default getRequestConfig(async ({ locale }) => {
    const baseLocale = new Intl.Locale(locale).baseName;

    if (!locales.includes(baseLocale)) notFound();

    return {
        messages: (await import(`./messages/${baseLocale}.json`)).default,
    };
});