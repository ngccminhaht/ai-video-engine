import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AdminGuard } from "@/lib/auth/guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden admin-theme">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="max-w-[1560px] mx-auto px-8 py-8 max-lg:px-6 max-md:px-4 max-md:py-5">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
