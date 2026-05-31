import { SITE_DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-metadata";

/** Schema.org Organization + WebSite for homepage rich results. */
export function buildHomeJsonLd(): Record<string, unknown>[] {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    description: SITE_DEFAULT_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "Zambia",
    },
    sameAs: [] as string[],
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DEFAULT_DESCRIPTION,
    inLanguage: "en-ZM",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/jobs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return [organization, webSite];
}
