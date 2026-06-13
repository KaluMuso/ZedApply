"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/shared/EmptyState";
import { apiFetch } from "@/lib/api";

export interface TenderMatch {
  tender_id: string;
  procuring_entity: string;
  title: string;
  similarity: number;
  final_score: number;
  category: string;
  province: string;
  closing_date: string;
  source_url?: string;
  requirements?: string;
}

export default function TendersPageClient() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  
  const [tenders, setTenders] = useState<TenderMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/tenders");
      return;
    }

    const fetchMatches = async () => {
      try {
        setLoading(true);
        // Calls the new backend wrapper endpoint that executes the RPC
        const data = await apiFetch<TenderMatch[]>("/tenders/matches", { token: token || undefined });
        setTenders(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load tender matches.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [token, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="container py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" style={{ borderColor: 'var(--primary)' }}></div>
        <p className="mt-4 text-sm font-medium" style={{ color: 'var(--muted)' }}>Matching tenders for your business...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Tender Opportunities</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
            AI-matched procurement contracts tailored to your business profile capabilities.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg border flex items-center gap-3" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)' }}>
          <span style={{ color: 'var(--danger)' }}>
            <Icon name="x" className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      {tenders.length === 0 ? (
        <EmptyState
          title="No Matching Tenders"
          description="Update your business profile details, industry tags, and operating provinces under Settings to refine your matches."
          ctaText="Edit Business Profile"
          ctaHref="/settings/business-profile"
        />
      ) : (
        <div className="grid gap-4">
          {tenders.map((tender) => (
            <div 
              key={tender.tender_id} 
              className="p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}>
                    {tender.category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}>
                    <Icon name="map" size={12} />
                    {tender.province}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1">{tender.title}</h3>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--primary)' }}>
                  {tender.procuring_entity}
                </p>
                {tender.requirements && (
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--muted)' }}>
                    <strong>Requirements:</strong> {tender.requirements}
                  </p>
                )}
              </div>

              <div className="flex md:flex-col items-end justify-between md:justify-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-dashed" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Match Score</span>
                    <span className="text-lg font-extrabold" style={{ color: tender.final_score >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                      {Math.round(tender.final_score)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                  <Icon name="calendar" size={13} />
                  <span>Closes {new Date(tender.closing_date).toLocaleDateString()}</span>
                </div>

                {tender.source_url && (
                  <a 
                    href={tender.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-semibold underline flex items-center gap-1 hover:text-primary transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    View Source Portal
                    <Icon name="external" size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
