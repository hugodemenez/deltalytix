'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Loader2 } from 'lucide-react'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { useUserData } from '@/components/context/user-data'

interface TradeImageUploadDialogProps {
  tradeIds: string[]
  isSecondImage?: boolean
  onSuccess?: (imageUrl: string) => void
  children?: React.ReactNode
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Generate a UUID v4 using the Web Crypto API
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function TradeImageUploadDialog({ 
  tradeIds, 
  isSecondImage = false, 
  onSuccess,
  children 
}: TradeImageUploadDialogProps) {
  const t = useI18n()
  const [open, setOpen] = useState(false)
  const { user } = useUserData()
  const [generatedId] = useState(() => tradeIds[0]?.includes('undefined') ? generateUUID() : tradeIds[0])
  
  const uploadProps = useSupabaseUpload({
    bucketName: 'trade-images',
    path: user?.id + '/' + generatedId,
    allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
  })

  // Listen for successful uploads
  useEffect(() => {
    if (uploadProps.isSuccess && uploadProps.files.length > 0) {
      const file = uploadProps.files[0]
      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trade-images/${user?.id}/${generatedId}/${file.name}`
      onSuccess?.(imageUrl)
      setOpen(false)
      toast.success(t('trade-table.imageUploadSuccess'))
    } else if (uploadProps.errors.length > 0) {
      const error = uploadProps.errors[0].message
      toast.error(t('trade-table.imageUploadError', { error }))
    }
  }, [uploadProps.isSuccess, uploadProps.files, uploadProps.errors, onSuccess, user?.id, t, generatedId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isSecondImage ? t('trade-table.uploadSecondImage') : t('trade-table.uploadImage')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Dropzone {...uploadProps}>
            {uploadProps.files.length > 0 ? (
              <DropzoneContent />
            ) : (
              <DropzoneEmptyState />
            )}
          </Dropzone>
        </div>
      </DialogContent>
    </Dialog>
  )
} 