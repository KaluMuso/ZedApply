import { redirect } from "next/navigation";

/** Scraper ops live on overview (LLM + export) until a dedicated page ships. */
export default function AdminScraperPage() {
  redirect("/admin/overview");
}
