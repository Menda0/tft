import { AuthProvider } from "@/components/auth/auth-provider";
import { AdminBadge } from "@/components/layout/admin-badge";
import { PhoneFrame } from "@/components/layout/phone-frame";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminBadge />
      <PhoneFrame>{children}</PhoneFrame>
    </AuthProvider>
  );
}
