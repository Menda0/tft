import { AuthProvider } from "@/components/auth/auth-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { WalletLinkProvider } from "@/components/wallet/wallet-link-provider";
import { WalletProvider } from "@/components/wallet/wallet-provider";

export default function AdminDesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider>
      <AuthProvider>
        <WalletLinkProvider>
          <AdminShell>{children}</AdminShell>
        </WalletLinkProvider>
      </AuthProvider>
    </WalletProvider>
  );
}
