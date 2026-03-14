import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="h-12 w-12">
          <rect x="8" y="8" width="48" height="48" rx="12" fill="#4F8BFF"/>
          <path d="M22 18h12c4.4 0 8 3.6 8 8 0 2.5-1.2 4.8-3 6.2 2.5 1.5 4 4.2 4 7.3 0 4.7-3.8 8.5-8.5 8.5H22V18zm6 5v8h6c1.7 0 3-1.3 3-3v-2c0-1.7-1.3-3-3-3h-6zm0 13v8h7.5c1.9 0 3.5-1.6 3.5-3.5v-1c0-1.9-1.6-3.5-3.5-3.5H28z" fill="#FFFFFF"/>
        </svg>
        <span className="text-2xl font-bold tracking-tight text-foreground font-sans">BossBoard</span>
      </Link>
      <div className="w-full max-w-[420px]">{children}</div>
      <p className="mt-8 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} BossBoard. All rights reserved.
      </p>
    </div>
  );
}
