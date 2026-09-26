import { AppShell } from "@/components/app-shell";
import { callBackend } from "@/lib/call-backend";
import type { User } from "@/lib/types";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await callBackend<User>("/auth/profile");
  return <AppShell user={user}>{children}</AppShell>;
}
