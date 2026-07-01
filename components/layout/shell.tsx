import { AuthProvider } from "@/components/auth/auth-provider";
import { AdminBadge } from "@/components/layout/admin-badge";
import { PhoneFrame } from "@/components/layout/phone-frame";
import { WalletLinkProvider } from "@/components/wallet/wallet-link-provider";
import { WalletProvider } from "@/components/wallet/wallet-provider";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>
        <WalletLinkProvider>
          <AdminBadge />
          <PhoneFrame>{children}</PhoneFrame>
        </WalletLinkProvider>
      </AuthProvider>
    </WalletProvider>
  );
}
