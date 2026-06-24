import { toast, type ExternalToast } from 'sonner'

export function formatToastCopyText(title: string, description?: string): string {
  return description ? `${title}\n\n${description}` : title
}

type ToastType = 'success' | 'error' | 'info' | 'warning'

export function showToastWithCopy(
  type: ToastType,
  title: string,
  options?: ExternalToast & { description?: string; copyLabel?: string },
) {
  const { description, copyLabel = 'Copy', ...rest } = options ?? {}
  const fullText = formatToastCopyText(title, description)

  toast[type](title, {
    ...rest,
    description,
    action: {
      label: copyLabel,
      onClick: () => {
        void navigator.clipboard.writeText(fullText)
      },
    },
  })
}

export async function runToastWithCopy<T>(
  run: () => Promise<T>,
  options: {
    loading: string
    success: (value: T) => { title: string; description?: string }
    error: (error: unknown) => { title: string; description?: string }
    copyLabel?: string
  },
): Promise<T> {
  const toastId = toast.loading(options.loading)
  const copyLabel = options.copyLabel ?? 'Copy'

  try {
    const value = await run()
    const { title, description } = options.success(value)
    const fullText = formatToastCopyText(title, description)
    toast.success(title, {
      id: toastId,
      description,
      action: {
        label: copyLabel,
        onClick: () => {
          void navigator.clipboard.writeText(fullText)
        },
      },
    })
    return value
  } catch (error) {
    const { title, description } = options.error(error)
    const fullText = formatToastCopyText(title, description)
    toast.error(title, {
      id: toastId,
      description,
      action: {
        label: copyLabel,
        onClick: () => {
          void navigator.clipboard.writeText(fullText)
        },
      },
    })
    throw error
  }
}
