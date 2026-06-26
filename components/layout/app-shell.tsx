import { Feed } from "@/components/feed/feed";
import { PhoneFrame } from "@/components/layout/phone-frame";

export function AppShell() {
  return (
    <PhoneFrame>
      <Feed />
    </PhoneFrame>
  );
}
