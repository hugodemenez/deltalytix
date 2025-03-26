'use client'

import { MDXProvider } from '@mdx-js/react'
import { useMemo } from 'react'
import type { ComponentProps, ReactNode, ComponentType } from 'react'

// Define MDX components with proper type casting
const components: Record<string, ComponentType<any>> = {
  table: (props: ComponentProps<'table'>) => (
    <div className="w-full my-6 overflow-x-auto">
      <table className="w-full border-collapse" {...props} />
    </div>
  ),
  thead: (props: ComponentProps<'thead'>) => (
    <thead className="border-b border-neutral-200 dark:border-neutral-800" {...props} />
  ),
  th: (props: ComponentProps<'th'>) => (
    <th className="px-6 py-3 text-left font-semibold" {...props} />
  ),
  td: (props: ComponentProps<'td'>) => (
    <td className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800" {...props} />
  ),
  tr: (props: ComponentProps<'tr'>) => (
    <tr className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/30" {...props} />
  ),
}

export function MDXContent({ children }: { children: ReactNode }) {
  const mdxComponents = useMemo(() => components, [])

  return <MDXProvider components={mdxComponents as any}>{children}</MDXProvider>
} 