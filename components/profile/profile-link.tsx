import Link from "next/link";

import { cn } from "@/lib/utils";

type ProfileLinkProps = {
  handle: string;
  className?: string;
  children: React.ReactNode;
};

export function ProfileLink({ handle, className, children }: ProfileLinkProps) {
  return (
    <Link
      href={`/u/${handle}`}
      className={cn("hover:underline", className)}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
}
