"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CvBuilderPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">CV Builder</h1>
      <p className="text-sm text-muted-foreground">
        Guided CV builder is prepared here as the next phase.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Step-by-step wizard</CardTitle>
          <CardDescription>Personal Info → Education → Experience → Skills → Preview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This page is scaffolded and ready for the full form workflow and PDF export integration.
          </p>
          <Button type="button" disabled>
            Coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
