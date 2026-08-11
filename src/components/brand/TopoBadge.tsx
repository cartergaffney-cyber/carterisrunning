import Image from "next/image";

/**
 * The topo-contour icon mark. Unlike the wordmark lockup this contains no
 * text, so it carries no font dependency and is safe to use through <img>,
 * CSS backgrounds, or as a favicon.
 */
export function TopoBadge({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/branding/icon-03-topo-badge.svg"
      alt=""
      width={size}
      height={Math.round((size * 210) / 200)}
      className={className}
      priority
    />
  );
}
