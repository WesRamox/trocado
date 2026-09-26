import { AppShell } from "@/components/app-shell";
import { getProfile } from "@/lib/profile";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getProfile();
  return <AppShell user={user}>{children}</AppShell>;
}
