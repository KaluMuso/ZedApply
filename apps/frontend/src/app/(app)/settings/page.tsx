"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* Using native checkbox — no Switch in list if not installed */
export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, token } = useAuth();
  const [alerts, setAlerts] = useState(true);
  const [openDelete, setOpenDelete] = useState(false);
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);
  if (isLoading || !isAuthenticated) {
    return <p className="text-sm text-muted-foreground">…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground text-sm mb-6">How Zed CV reaches you and account safety.</p>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>WhatsApp & alerts</CardTitle>
          <CardDescription>Changes are stored in this session until we wire notification APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 min-h-11">
            <span className="text-sm">Daily job alerts on WhatsApp (preferred)</span>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-input"
              checked={alerts}
              onChange={(e) => {
                setAlerts(e.target.checked);
                toast.success("Preference saved in this device session.");
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>We will add Bemba in a later release. English is default for now.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">English (Zambia)</p>
        </CardContent>
      </Card>

      <div className="mt-8 rounded-xl border border-destructive/40 p-4">
        <h2 className="text-sm font-semibold text-destructive">Delete account</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Permanently remove this account. A backend `DELETE` endpoint is still to be added — for now you can sign
          out from every device and contact support to purge data.
        </p>
        <Button
          className="mt-3"
          type="button"
          variant="destructive"
          onClick={() => setOpenDelete(true)}
        >
          Delete my account
        </Button>
      </div>

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This is not connected to a live delete yet. We will only sign you out. Contact support to erase data
              (GDPR-style) until the API is ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpenDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              type="button"
              onClick={() => { logout(); if (token) { localStorage.removeItem("zed_cv_token"); } setOpenDelete(false); router.push("/"); toast.success("Signed out"); }}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
