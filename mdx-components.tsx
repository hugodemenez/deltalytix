import type { MDXComponents } from 'mdx/types';
import Image, { ImageProps } from 'next/image';
import Link from 'next/link';
import { AnchorHTMLAttributes, ComponentProps, HTMLAttributes, ImgHTMLAttributes } from 'react';

// Extract ref from props to avoid type issues
type WithoutRef<T> = Omit<T, 'ref'>;

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = '', className = '', ...props }: WithoutRef<AnchorHTMLAttributes<HTMLAnchorElement>>) => {
      // Don't apply underline to anchor links wrapping headings (from rehype-autolink-headings)
      const isAnchorLink = className.includes('anchor');
      const linkClasses = isAnchorLink 
        ? '' 
        : "underline decoration-neutral-400 underline-offset-2 hover:text-neutral-800 hover:decoration-neutral-800 dark:hover:text-neutral-200 dark:hover:decoration-neutral-200";
      
      if (href.startsWith('http')) {
        return (
          <a
            className={linkClasses}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        );
      }
      return (
        <Link
          href={href}
          className={linkClasses}
          {...props}
        />
      );
    },
    img: (props: WithoutRef<ImgHTMLAttributes<HTMLImageElement>>) => {
      const { src, alt, width, height, ...rest } = props;
      return (
        <Image
          src={typeof src === 'string' ? src : ''}
          alt={alt || ''}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800"
          width={Number(width) || 800}
          height={Number(height) || 400}
          priority
          {...rest}
        />
      );
    },
    table: ({ ...props }: WithoutRef<HTMLAttributes<HTMLTableElement>>) => (
      <div className="mt-6 mb-8 w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...props} />
      </div>
    ),
    thead: ({ ...props }: WithoutRef<HTMLAttributes<HTMLTableSectionElement>>) => (
      <thead className="border-b border-neutral-200 dark:border-neutral-800" {...props} />
    ),
    th: ({ ...props }: WithoutRef<HTMLAttributes<HTMLTableHeaderCellElement>>) => (
      <th
        className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100"
        {...props}
      />
    ),
    td: ({ ...props }: WithoutRef<HTMLAttributes<HTMLTableDataCellElement>>) => (
      <td
        className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 text-neutral-700 dark:text-neutral-300"
        {...props}
      />
    ),
    tr: ({ ...props }: WithoutRef<HTMLAttributes<HTMLTableRowElement>>) => (
      <tr
        className="m-0 p-0 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
        {...props}
      />
    ),
    h1: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLHeadingElement>>) => (
      <h1
        className="mt-8 mb-4 text-3xl font-bold text-neutral-900 dark:text-neutral-100 scroll-m-20"
        {...props}
      />
    ),
    h2: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLHeadingElement>>) => (
      <h2
        className="mt-8 mb-4 text-2xl font-bold text-neutral-900 dark:text-neutral-100 scroll-m-20 border-b pb-2 border-neutral-200 dark:border-neutral-800"
        {...props}
      />
    ),
    h3: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLHeadingElement>>) => (
      <h3
        className="mt-8 mb-4 text-xl font-bold text-neutral-900 dark:text-neutral-100 scroll-m-20"
        {...props}
      />
    ),
    p: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLParagraphElement>>) => (
      <p
        className="mb-4 leading-7 text-neutral-700 dark:text-neutral-300 not-first:mt-6"
        {...props}
      />
    ),
    ul: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLUListElement>>) => (
      <ul className="mb-4 ml-6 list-disc text-neutral-700 dark:text-neutral-300 [&>li]:mt-2" {...props} />
    ),
    ol: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLOListElement>>) => (
      <ol className="mb-4 ml-6 list-decimal text-neutral-700 dark:text-neutral-300 [&>li]:mt-2" {...props} />
    ),
    li: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLLIElement>>) => (
      <li className="mb-2 text-neutral-700 dark:text-neutral-300" {...props} />
    ),
    blockquote: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLQuoteElement>>) => (
      <blockquote
        className="mt-6 border-l-2 border-neutral-300 pl-6 italic text-neutral-800 dark:border-neutral-700 dark:text-neutral-200"
        {...props}
      />
    ),
    hr: ({ ...props }: WithoutRef<HTMLAttributes<HTMLHRElement>>) => (
      <hr className="my-8 border-neutral-200 dark:border-neutral-800" {...props} />
    ),
    pre: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLPreElement>>) => (
      <pre
        className="mb-4 mt-6 overflow-x-auto rounded-lg bg-neutral-900 py-4"
        {...props}
      />
    ),
    code: ({ className, ...props }: WithoutRef<HTMLAttributes<HTMLElement>>) => {
      // If it's an inline code block
      if (!className) {
        return (
          <code
            className="relative rounded bg-neutral-100 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-200"
            {...props}
          />
        );
      }
      // If it's a code block with language
      return (
        <code
          className="relative rounded bg-neutral-900 px-[0.3rem] py-[0.2rem] font-mono text-sm text-neutral-50"
          {...props}
        />
      );
    },
    ...components,
  };
} 