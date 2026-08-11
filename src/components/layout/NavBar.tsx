import Link from "next/link";
import { TopoBadge } from "@/components/brand/TopoBadge";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function NavBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  const unreadCount = await prisma.coachNote.count({ where: { userId: user.id, dismissedAt: null } });

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/calendar", label: "Calendar" },
    { href: "/races", label: "Races" },
    { href: "/runs", label: "Runs" },
    { href: "/clubs", label: "Clubs" },
    { href: "/messages", label: "Messages", badge: unreadCount },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="flex items-center gap-6 border-b border-border px-8 py-3">
      <Link href="/" className="flex items-center gap-2.5">
        <TopoBadge size={26} />
        <span className="brand-label text-sm text-[color:var(--brand-blue)]">Carter Is Running</span>
      </Link>
      <div className="flex gap-5">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="brand-label flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-[color:var(--brand-blue)]"
          >
            {link.label}
            {!!link.badge && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                {link.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
