import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <img src="/logo.png" alt="" width={40} height={40} className="h-10 w-10" />
        <span className="text-xl font-bold">BossBoard</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
