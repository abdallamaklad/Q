import { requireSession } from "@/lib/rbac";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { QWordmark } from "@/components/brand/logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <QWordmark className="text-xl md:hidden" />
          <div className="ml-auto">
            <UserMenu name={ctx.name} email={ctx.email} role={ctx.role} orgName={ctx.orgName} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
