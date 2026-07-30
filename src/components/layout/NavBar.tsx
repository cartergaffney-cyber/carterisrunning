import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/runs", label: "Runs" },
  { href: "/clubs", label: "Clubs" },
  { href: "/settings", label: "Settings" },
];

export async function NavBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <nav className="flex items-center gap-6 border-b border-border px-8 py-3">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Image src="/branding/carter-is-running-icon.svg" alt="" width={22} height={22} className="rounded-md" />
        <span className="text-sm font-semibold tracking-tight">Carter Is Running</span>
      </Link>
      <div className="flex gap-5">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
