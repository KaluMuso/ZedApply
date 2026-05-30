export const EMPLOYER_NAV = [
  {
    slug: "dashboard",
    label: "Overview",
    description: "Subscription usage and quick actions",
    href: "/employer/dashboard",
  },
  {
    slug: "search",
    label: "Search",
    description: "Find candidates by skills and location",
    href: "/employer/search",
  },
  {
    slug: "contacts",
    label: "Contacts",
    description: "Consent requests and revealed details",
    href: "/employer/contacts",
  },
  {
    slug: "team",
    label: "Team",
    description: "Invite recruiters and manage seats",
    href: "/employer/team",
  },
  {
    slug: "billing",
    label: "Billing",
    description: "Employer Lite or Pro subscription",
    href: "/employer/billing",
  },
] as const;

export type EmployerNavSlug = (typeof EMPLOYER_NAV)[number]["slug"];

export function employerSectionFromPath(pathname: string): EmployerNavSlug {
  const hit = EMPLOYER_NAV.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`),
  );
  if (hit) return hit.slug;
  if (pathname.startsWith("/employer/candidates")) return "search";
  return "dashboard";
}
