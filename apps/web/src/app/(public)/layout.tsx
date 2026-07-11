import { Video } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/images/logo-full.png" alt="Revid.IO" className="h-10 w-auto object-contain" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
