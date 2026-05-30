import { EmployerGuard } from "../employer-guard";

export default function ProtectedEmployerLayout({ children }: { children: React.ReactNode }) {
  return <EmployerGuard>{children}</EmployerGuard>;
}
