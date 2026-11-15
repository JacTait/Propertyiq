import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">404</p>
      <h1 className="font-heading text-3xl font-medium">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The page you are looking for does not exist or has moved.</p>
      <Button asChild>
        <Link href="/quick-underwrite">Back to Quick Underwrite</Link>
      </Button>
    </div>
  );
}
