import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8 flex items-center">
        <img src="/Logo.png" alt="BossBoard" height={36} style={{ height: 36, width: 'auto' }} />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
