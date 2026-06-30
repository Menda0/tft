import { AuthProvider } from "@/components/auth/auth-provider";
import { AdminBadge } from "@/components/layout/admin-badge";
import { PhoneFrame } from "@/components/layout/phone-frame";
import { WalletProvider } from "@/components/wallet/wallet-provider";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>
        <AdminBadge />
        <PhoneFrame>{children}</PhoneFrame>
      </AuthProvider>
    </WalletProvider>
  );
}
