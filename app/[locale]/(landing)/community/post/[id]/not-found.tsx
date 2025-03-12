'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/locales/client'
export default function NotFound() {
  const t = useI18n()
  
  return (
    <div className="container max-w-4xl py-16">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">
          {t('community.post.notFound')}
        </p>
        <Button asChild>
          <Link href="/community">
            {t('common.back')}
          </Link>
        </Button>
      </div>
    </div>
  )
} 