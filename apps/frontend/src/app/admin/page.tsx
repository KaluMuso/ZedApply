"use client";

import { useCallback, useEffect, useState } from "react";
import {
  admin,
  type AdminStats,
  type AdminUserRow,
  type AdminJobRow,
  type AdminPaymentRow,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function formatNgwee(n: number): string {
  return `K${(n / 100).toLocaleString("en-ZM", { maximumFractionDigits: 2 })}`;
}

function formatDate(s: string | null): string {
  if (!s) {
    return "—";
  }
  return new Date(s).toLocaleDateString("en-ZM");
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );
}

function UsersTab({ token }: { token: string }) {
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    admin
      .users(token, { page, search: search || undefined })
      .then((r) => {
        setData(r.users);
        setPages(r.pages);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, [token, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardContent className="p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput);
          }}
          className="flex gap-2 p-3 border-b border-border"
        >
          <Input
            placeholder="Search phone, name, email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 max-w-sm"
          />
          <Button type="submit" size="sm" className="min-h-9">Search</Button>
        </form>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Matches</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.full_name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{u.phone}</TableCell>
                    <TableCell>
                      <Badge variant={u.subscription_tier === "mwana" ? "secondary" : "default"}>
                        {u.subscription_tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {u.matches_used}/{u.matches_limit}
                    </TableCell>
                    <TableCell>
                      {u.role === "superadmin" ? (
                        <Badge variant="destructive">admin</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">user</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {pages > 1 && (
          <div className="p-3 flex items-center justify-end gap-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="min-h-9"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-9"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobsTab({ token }: { token: string }) {
  const [data, setData] = useState<AdminJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params: { page: number; expired?: boolean; is_active?: boolean } = { page };
    if (filter === "expired") {
      params.expired = true;
    }
    if (filter === "active") {
      params.is_active = true;
    }
    admin
      .jobs(token, params)
      .then((r) => {
        setData(r.jobs);
        setPages(r.pages);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load jobs"))
      .finally(() => setLoading(false));
  }, [token, page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onBulkDeactivate = async () => {
    setBulkLoading(true);
    try {
      const r = await admin.bulkDeactivate(token, { expired_only: true });
      toast.success(`Deactivated ${r.deactivated} expired job(s).`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap gap-2 p-3 border-b border-border items-center">
          <select
            className="h-9 min-h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as typeof filter);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="expired">Expired & still active</option>
          </select>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="min-h-9 ml-auto"
            disabled={bulkLoading}
            onClick={onBulkDeactivate}
          >
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deactivate all expired"}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Closes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    No jobs match this filter.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                data.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="max-w-xs truncate" title={j.title}>{j.title}</TableCell>
                    <TableCell>{j.company || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs">{j.source}</TableCell>
                    <TableCell className="tabular-nums">{j.quality_score}</TableCell>
                    <TableCell>
                      {j.is_active ? (
                        <Badge variant="default">active</Badge>
                      ) : (
                        <Badge variant="secondary">inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(j.closing_date)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {pages > 1 && (
          <div className="p-3 flex items-center justify-end gap-2 border-t border-border">
            <Button variant="outline" size="sm" className="min-h-9" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" className="min-h-9" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentsTab({ token }: { token: string }) {
  const [data, setData] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [totalCompleted, setTotalCompleted] = useState(0);

  useEffect(() => {
    setLoading(true);
    admin
      .payments(token, { page, status: statusFilter || undefined })
      .then((r) => {
        setData(r.payments);
        setPages(r.pages);
        setTotalCompleted(r.total_completed_ngwee);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load payments"))
      .finally(() => setLoading(false));
  }, [token, page, statusFilter]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap gap-3 p-3 border-b border-border items-center">
          <select
            className="h-9 min-h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <p className="ml-auto text-sm text-muted-foreground">
            Lifetime completed: <span className="font-medium text-foreground">{formatNgwee(totalCompleted)}</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!loading && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">No payments yet.</TableCell>
                </TableRow>
              )}
              {!loading &&
                data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.user_phone || "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatNgwee(p.amount)}</TableCell>
                    <TableCell className="text-xs">{p.payment_method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "default"
                            : p.status === "failed" || p.status === "refunded"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {pages > 1 && (
          <div className="p-3 flex items-center justify-end gap-2 border-t border-border">
            <Button variant="outline" size="sm" className="min-h-9" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" className="min-h-9" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    admin
      .stats(token)
      .then(setStats)
      .catch((e) => setStatsErr(e instanceof Error ? e.message : "Failed to load stats"));
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm text-muted-foreground">Live data. Superadmin only.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <StatCard
          label="Users"
          value={stats ? stats.users_total.toLocaleString() : "—"}
          hint={stats ? `${stats.users_active_30d} active in 30d` : undefined}
        />
        <StatCard
          label="Active subs"
          value={stats ? stats.subscriptions_active.toLocaleString() : "—"}
          hint={stats ? `${stats.subscriptions_paid} paying` : undefined}
        />
        <StatCard
          label="Jobs in DB"
          value={stats ? stats.jobs_active.toLocaleString() : "—"}
          hint={stats ? `${stats.jobs_expired} expired and still active` : undefined}
        />
        <StatCard
          label="Matches (24h)"
          value={stats ? stats.matches_24h.toLocaleString() : "—"}
          hint={stats ? `${stats.matches_total.toLocaleString()} all time` : undefined}
        />
      </div>

      {stats && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <StatCard label="Revenue (30d)" value={formatNgwee(stats.revenue_ngwee_30d)} />
          <StatCard label="Revenue (lifetime)" value={formatNgwee(stats.revenue_ngwee_total)} />
        </div>
      )}

      {statsErr && (
        <p className="text-sm text-destructive mt-2">Stats: {statsErr}</p>
      )}

      <Tabs className="mt-8" defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="min-h-9">Users</TabsTrigger>
          <TabsTrigger value="jobs" className="min-h-9">Jobs</TabsTrigger>
          <TabsTrigger value="payments" className="min-h-9">Payments</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4" value="users">
          <UsersTab token={token} />
        </TabsContent>
        <TabsContent className="mt-4" value="jobs">
          <JobsTab token={token} />
        </TabsContent>
        <TabsContent className="mt-4" value="payments">
          <PaymentsTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
