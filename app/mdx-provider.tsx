'use client'

import { MDXProvider } from '@mdx-js/react'
import { useMemo } from 'react'
import { DetailedHTMLProps, TableHTMLAttributes, HTMLAttributes } from 'react'

const components = {
  table: (props: DetailedHTMLProps<TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>) => (
    <div className="w-full my-6 overflow-x-auto">
      <table className="w-full border-collapse" {...props} />
    </div>
  ),
  thead: (props: HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="border-b border-neutral-200 dark:border-neutral-800" {...props} />
  ),
  th: (props: HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-6 py-3 text-left font-semibold" {...props} />
  ),
  td: (props: HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800" {...props} />
  ),
  tr: (props: HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/30" {...props} />
  ),
}

export function MDXContent({ children }: { children: React.ReactNode }) {
  const mdxComponents = useMemo(() => components, [])

  return <MDXProvider components={mdxComponents}>{children}</MDXProvider>
} 