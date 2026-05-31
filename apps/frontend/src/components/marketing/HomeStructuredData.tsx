import { buildHomeJsonLd } from "@/lib/site-jsonld";

/** JSON-LD for homepage — Organization + WebSite (optional rich results). */
export function HomeStructuredData() {
  const graphs = buildHomeJsonLd();
  return (
    <>
      {graphs.map((graph) => (
        <script
          key={graph["@type"] as string}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      ))}
    </>
  );
}
