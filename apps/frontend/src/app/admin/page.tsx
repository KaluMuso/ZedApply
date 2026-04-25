"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { health } from "@/lib/api";
import { useEffect, useState } from "react";

/* TODO: GET /admin/stats (users, subs, jobs, match volume) — not on live API yet */
/* TODO: GET /admin/jobs, POST /admin/jobs/bulk-deactivate — */
/* TODO: GET /admin/payments for revenue */
/* TODO: Log drain or Sentry for system tab */

export default function AdminPage() {
  const [h, setH] = useState<string | null>(null);
  useEffect(() => {
    health
      .check()
      .then((r) => setH(r.status))
      .catch(() => setH("error"));
  }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm text-muted-foreground">Superadmin only. Data below is placeholder until we ship admin APIs.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {["Users", "Active subs", "Jobs in DB", "Matches (24h)"].map((t) => (
          <Card key={t}>
            <CardHeader>
              <CardDescription>{t}</CardDescription>
              <CardTitle className="text-2xl">—</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Tabs className="mt-8" defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="min-h-9">Users</TabsTrigger>
          <TabsTrigger value="jobs" className="min-h-9">Jobs</TabsTrigger>
          <TabsTrigger value="subs" className="min-h-9">Subscriptions</TabsTrigger>
          <TabsTrigger value="sys" className="min-h-9">System</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4" value="users">
          <Card>
            <CardContent className="p-0">
              <div className="p-3 text-sm text-amber-700 border-b border-amber-200/60 bg-amber-50/50">
                TODO: <code>GET /admin/users</code> for searchable table. Inline edit requires PATCH permissions.
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Matches used</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No rows — connect backend first.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent className="mt-4" value="jobs">
          <p className="text-sm text-muted-foreground p-2">
            TODO: <code>GET /admin/jobs?expired=1</code> + bulk deactivate. Today we only have user-facing{" "}
            <code>GET /jobs</code>
          </p>
        </TabsContent>
        <TabsContent className="mt-4" value="subs">
          <p className="text-sm text-muted-foreground p-2">
            TODO: Revenue rollups and payment rows from a finance export or dedicated endpoint.
          </p>
        </TabsContent>
        <TabsContent className="mt-4" value="sys">
          <p className="text-sm p-2">
            Public <code>GET /health</code> status: <span className="font-mono">{h ?? "…"}</span>
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
