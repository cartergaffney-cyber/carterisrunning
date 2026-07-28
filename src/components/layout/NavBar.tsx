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
    <nav className="flex items-center gap-4 border-b border-zinc-200 px-8 py-3 dark:border-zinc-800">
      <span className="text-sm font-semibold">Running Trainer</span>
      <div className="flex gap-3">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-300"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
