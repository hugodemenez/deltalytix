import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <Logo className="w-24 h-24 mb-8 fill-primary" />
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-muted-foreground mb-6">
        Page Not Found
      </h2>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Button asChild>
        <Link href="/">
          Go back home
        </Link>
      </Button>
    </div>
  )
}
