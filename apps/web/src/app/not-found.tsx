import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#0A0A0A] mb-4">404</h1>
        <h2 className="text-xl font-medium text-[#0A0A0A] mb-2">Page not found</h2>
        <p className="text-sm text-[#666666] mb-8 max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/login"
          className="inline-flex px-5 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
