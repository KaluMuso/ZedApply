"use client";

import { useEffect, useState } from "react";
import { adminReferrals } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";

export function ReferralsTab({ token }: { token: string }) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [confRes, payRes] = await Promise.all([
        adminReferrals.getConfig(token),
        adminReferrals.getPayouts(token),
      ]);
      setConfigs(confRes.configs);
      setPayouts(payRes.payouts);
    } catch (e: any) {
      notify.error(e.message || "Failed to load referrals data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleUpdateConfig = async (id: number, patch: any) => {
    try {
      const res = await adminReferrals.updateConfig(token, id, patch);
      setConfigs((prev) => prev.map((c) => (c.id === id ? res.config : c)));
      notify.success("Updated config");
    } catch (e: any) {
      notify.error(e.message || "Failed to update config");
    }
  };

  const handleMarkPaid = async (id: number) => {
    if (!window.confirm("Mark this payout as credited?")) return;
    try {
      await adminReferrals.markPaid(token, id);
      notify.success("Marked as paid");
      loadData();
    } catch (e: any) {
      notify.error(e.message || "Failed to mark paid");
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading referrals...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Referrals & Growth Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage referral rewards, payouts, and milestones.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending payouts.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">User ID</th>
                    <th className="py-2">Phone</th>
                    <th className="py-2">Amount (ZMW)</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-2 text-xs font-mono truncate max-w-[120px]">{p.user_id}</td>
                      <td className="py-3 pr-2">{p.phone || "Unknown"}</td>
                      <td className="py-3 pr-2 font-medium text-emerald-600 dark:text-emerald-400">
                        K{p.amount_ngwee / 100}
                      </td>
                      <td className="py-3 text-right">
                        <Button size="sm" onClick={() => handleMarkPaid(p.id)} className="bg-emerald-600 hover:bg-emerald-700">
                          Mark Paid
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reward Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Reward Type</th>
                  <th className="py-2">Required Count</th>
                  <th className="py-2">Reward Value</th>
                  <th className="py-2 text-center">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {configs.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-2 font-medium capitalize">{c.reward_type.replace("_", " ")}</td>
                    <td className="py-3 pr-2">
                      <Input
                        type="number"
                        min={1}
                        value={c.required_count}
                        className="w-20 min-h-8"
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (val && val !== c.required_count) {
                            handleUpdateConfig(c.id, { required_count: val });
                          }
                        }}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setConfigs(configs.map(x => x.id === c.id ? { ...x, required_count: val } : x));
                        }}
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <Input
                        type="number"
                        min={1}
                        value={c.reward_value}
                        className="w-24 min-h-8"
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (val && val !== c.reward_value) {
                            handleUpdateConfig(c.id, { reward_value: val });
                          }
                        }}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setConfigs(configs.map(x => x.id === c.id ? { ...x, reward_value: val } : x));
                        }}
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={c.is_active}
                        onChange={(e) => handleUpdateConfig(c.id, { is_active: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
