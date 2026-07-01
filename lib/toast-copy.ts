import { toast, type ExternalToast } from 'sonner'

export function formatToastCopyText(title: string, description?: string): string {
  return description ? `${title}\n\n${description}` : title
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall back to execCommand for mobile browsers and restricted contexts.
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  } catch {
    return false
  }
}

type ToastType = 'success' | 'error' | 'info' | 'warning'

function buildCopyAction(fullText: string, copyLabel: string, copiedLabel?: string) {
  return {
    label: copyLabel,
    onClick: () => {
      void copyTextToClipboard(fullText).then((copied) => {
        if (copied && copiedLabel) {
          toast.success(copiedLabel)
        } else if (!copied) {
          toast.error('Could not copy text. Select and copy the message manually.')
        }
      })
    },
  }
}

export function showToastWithCopy(
  type: ToastType,
  title: string,
  options?: ExternalToast & {
    description?: string
    copyLabel?: string
    copiedLabel?: string
  },
) {
  const { description, copyLabel = 'Copy', copiedLabel, ...rest } = options ?? {}
  const fullText = formatToastCopyText(title, description)

  toast[type](title, {
    ...rest,
    description,
    action: buildCopyAction(fullText, copyLabel, copiedLabel),
  })
}

export async function runToastWithCopy<T>(
  run: () => Promise<T>,
  options: {
    loading: string
    success: (value: T) => { title: string; description?: string }
    error: (error: unknown) => { title: string; description?: string }
    copyLabel?: string
    copiedLabel?: string
  },
): Promise<T> {
  const toastId = toast.loading(options.loading)
  const copyLabel = options.copyLabel ?? 'Copy'
  const copiedLabel = options.copiedLabel

  try {
    const value = await run()
    const { title, description } = options.success(value)
    const fullText = formatToastCopyText(title, description)
    toast.success(title, {
      id: toastId,
      description,
      action: buildCopyAction(fullText, copyLabel, copiedLabel),
    })
    return value
  } catch (error) {
    const { title, description } = options.error(error)
    const fullText = formatToastCopyText(title, description)
    toast.error(title, {
      id: toastId,
      description,
      action: buildCopyAction(fullText, copyLabel, copiedLabel),
    })
    throw error
  }
}
