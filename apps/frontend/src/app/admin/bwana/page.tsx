"use client";

import dynamic from "next/dynamic";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const BwanaAdminPage = dynamic(
  () => import("./BwanaAdminPage").then((m) => ({ default: m.BwanaAdminPage })),
  { loading: () => <AdminTabLoader /> },
);

export default function AdminBwanaPage() {
  return <BwanaAdminPage />;
}
