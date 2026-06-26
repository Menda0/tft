import { AuthProvider } from "@/components/auth/auth-provider";
import { PhoneFrame } from "@/components/layout/phone-frame";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PhoneFrame>{children}</PhoneFrame>
    </AuthProvider>
  );
}
