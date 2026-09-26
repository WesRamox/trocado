import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await api<User>("/auth/profile");
  return <AppShell user={user}>{children}</AppShell>;
}
