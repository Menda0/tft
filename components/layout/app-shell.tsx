import { AuthProvider } from "@/components/auth/auth-provider";
import { Feed } from "@/components/feed/feed";
import { PhoneFrame } from "@/components/layout/phone-frame";

export function AppShell() {
  return (
    <AuthProvider>
      <PhoneFrame>
        <Feed />
      </PhoneFrame>
    </AuthProvider>
  );
}
