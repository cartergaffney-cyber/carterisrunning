"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLink {
  href: string;
  label: string;
  badge?: number;
}

/**
 * Client half of the nav, split out purely so the active route can be read from
 * the pathname -- the surrounding bar stays a server component so it can query
 * the unread count without a round trip.
 */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-[22px]">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.label}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`brand-label flex items-center gap-2 pb-1 text-xs tracking-[0.16em] transition-colors ${
              active
                ? "border-b-2 border-accent text-foreground"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
            {!!link.badge && (
              <span className="metric flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-info px-1 text-[11px] text-accent-foreground">
                {link.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
