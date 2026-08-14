import Link from "next/link";
import { TopoBadge } from "@/components/brand/TopoBadge";
import { NavLinks, type NavLink } from "@/components/layout/NavLinks";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** "6m ago" / "2h ago" / "3d ago", or null when nothing has synced yet. */
function relativeSince(date: Date | null): string | null {
  if (!date) return null;
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function NavBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  const unreadCount = await prisma.coachNote.count({ where: { userId: user.id, dismissedAt: null } });

  const navLinks: NavLink[] = [
    { href: "/dashboard", label: "Today" },
    { href: "/calendar", label: "Calendar" },
    { href: "/races", label: "Races" },
    { href: "/runs", label: "Runs" },
    { href: "/clubs", label: "Clubs" },
    { href: "/messages", label: "Messages", badge: unreadCount },
    { href: "/settings", label: "Settings" },
  ];

  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("") || "CG";
  const synced = relativeSince(user.lastSyncedAt);

  return (
    <nav className="flex h-16 items-center justify-between gap-7 border-b border-border px-8">
      <div className="flex items-center gap-7">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <TopoBadge size={26} />
          <span className="brand-display text-[17px] leading-none text-info">CARTER</span>
        </Link>
        <NavLinks links={navLinks} />
      </div>
      <div className="flex items-center gap-3">
        {synced && <span className="brand-label text-[11px] text-faint-foreground">Synced {synced}</span>}
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface-muted text-[13px] font-semibold text-info">
          {initials}
        </span>
      </div>
    </nav>
  );
}
