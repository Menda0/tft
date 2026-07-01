import Link from "next/link";

import { cn } from "@/lib/utils";

type FarmerLinkProps = {
  username: string;
  className?: string;
  children: React.ReactNode;
};

export function FarmerLink({ username, className, children }: FarmerLinkProps) {
  return (
    <Link
      href={`/farmers/${encodeURIComponent(username)}`}
      className={cn("hover:underline", className)}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
}
