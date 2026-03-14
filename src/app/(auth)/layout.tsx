import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/Logo.png"
          alt="BossBoard"
          width={48}
          height={48}
          className="h-12 w-12"
        />
        <span className="text-2xl font-bold tracking-tight text-foreground font-sans">BossBoard</span>
      </Link>
      <div className="w-full max-w-[420px]">{children}</div>
      <p className="mt-8 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} BossBoard. All rights reserved.
      </p>
    </div>
  );
}
