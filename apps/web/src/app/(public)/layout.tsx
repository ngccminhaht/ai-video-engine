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
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#111111]">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-[#0A0A0A]">
            AI Video Platform
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
