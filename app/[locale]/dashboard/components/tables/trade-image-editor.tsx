"use client"

import { useState, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, X, Upload } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { useUserStore } from '@/store/user-store'
import Image from "next/image"
import { createClient } from '@/lib/supabase'
import { useData } from '@/context/data-provider'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

const supabase = createClient()

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Generate a random 6-character alphanumeric ID
function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface TradeImageEditorProps {
  trade: any
  tradeIds: string[]
}

export function TradeImageEditor({ trade, tradeIds }: TradeImageEditorProps) {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const { updateTrades } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [isSecondImage, setIsSecondImage] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [uploadKey, setUploadKey] = useState(0)

  const [generatedId] = useState(() => {
    if (tradeIds[0]?.includes('undefined')) {
      return generateShortId()
    }
    // Take first 6 characters of the trade ID
    return tradeIds[0].slice(0, 6)
  })

  // Create separate upload instances for first and second images
  const firstImageUploadProps = useSupabaseUpload({
    bucketName: 'trade-images',
    path: user?.id + '/' + generatedId,
    allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
  })

  const secondImageUploadProps = useSupabaseUpload({
    bucketName: 'trade-images',
    path: user?.id + '/' + generatedId,
    allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
  })

  // Use the appropriate upload props based on which image slot we're uploading to
  const uploadProps = isSecondImage ? secondImageUploadProps : firstImageUploadProps

  const handleRemoveImage = async (isSecondImage: boolean, imageUrl?: string | null) => {
    try {
      const update = {
        [isSecondImage ? 'imageBase64Second' : 'imageBase64']: null
      }
      // Update trades
      await updateTrades(tradeIds, update)
      
      // Remove the image from Supabase storage
      if (imageUrl) {
        // Extract the path from the full URL
        const path = imageUrl.split('/storage/v1/object/public/trade-images/')[1]
        if (path) {
          await supabase.storage.from('trade-images').remove([path])
        }
      }
    } catch (error) {
      console.error('Error removing image:', error)
    }
  }

  const handleRemoveAllImages = async () => {
    try {
      // Update both image fields to null in a single operation
      const update = {
        imageBase64: null,
        imageBase64Second: null
      }
      await updateTrades(tradeIds, update)
      
      // Remove both images from Supabase storage
      const imagesToRemove: string[] = []
      if (trade.imageBase64) {
        const path = trade.imageBase64.split('/storage/v1/object/public/trade-images/')[1]
        if (path) imagesToRemove.push(path)
      }
      if (trade.imageBase64Second) {
        const path = trade.imageBase64Second.split('/storage/v1/object/public/trade-images/')[1]
        if (path) imagesToRemove.push(path)
      }
      
      if (imagesToRemove.length > 0) {
        await supabase.storage.from('trade-images').remove(imagesToRemove)
      }
    } catch (error) {
      console.error('Error removing all images:', error)
    }
  }

  const handleUpdateImage = async (imageBase64: string, isSecondImage: boolean) => {
    const update = {
      [isSecondImage ? 'imageBase64Second' : 'imageBase64']: imageBase64
    }
    await updateTrades(tradeIds, update)
  }

  // Listen for successful uploads from first image upload
  useEffect(() => {
    if (firstImageUploadProps.isSuccess && firstImageUploadProps.files.length > 0) {
      const file = firstImageUploadProps.files[0]
      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trade-images/${user?.id}/${generatedId}/${file.name}`
      handleUpdateImage(imageUrl, false)
      setUploadDialogOpen(false)
      toast.success(t('trade-table.imageUploadSuccess'))
      
      // Reset the upload props after successful upload
      firstImageUploadProps.setFiles([])
      firstImageUploadProps.setErrors([])
    } else if (firstImageUploadProps.errors.length > 0) {
      const error = firstImageUploadProps.errors[0].message
      toast.error(t('trade-table.imageUploadError', { error }))
    }
  }, [firstImageUploadProps.isSuccess, firstImageUploadProps.files, firstImageUploadProps.errors, user?.id, t, generatedId])

  // Listen for successful uploads from second image upload
  useEffect(() => {
    if (secondImageUploadProps.isSuccess && secondImageUploadProps.files.length > 0) {
      const file = secondImageUploadProps.files[0]
      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trade-images/${user?.id}/${generatedId}/${file.name}`
      handleUpdateImage(imageUrl, true)
      setUploadDialogOpen(false)
      toast.success(t('trade-table.imageUploadSuccess'))
      
      // Reset the upload props after successful upload
      secondImageUploadProps.setFiles([])
      secondImageUploadProps.setErrors([])
    } else if (secondImageUploadProps.errors.length > 0) {
      const error = secondImageUploadProps.errors[0].message
      toast.error(t('trade-table.imageUploadError', { error }))
    }
  }, [secondImageUploadProps.isSuccess, secondImageUploadProps.files, secondImageUploadProps.errors, user?.id, t, generatedId])

  // Reset upload state when dialog closes to ensure clean state for next upload
  useEffect(() => {
    if (!uploadDialogOpen) {
      firstImageUploadProps.setFiles([])
      firstImageUploadProps.setErrors([])
      secondImageUploadProps.setFiles([])
      secondImageUploadProps.setErrors([])
    }
  }, [uploadDialogOpen])

  const imageArray = [trade.imageBase64, trade.imageBase64Second].filter(Boolean)

  const handleUploadClick = () => {
    // If first image is null, set it as first image, otherwise set as second image
    setIsSecondImage(!!trade.imageBase64)
    // Force remount of upload component with new key to ensure clean state
    setUploadKey(prev => prev + 1)
    setUploadDialogOpen(true)
  }

  const handleThumbnailClick = (index: number) => {
    setSelectedImageIndex(index)
    setScale(1) // Reset zoom when changing images
  }

  return (
    <>
      <div className="flex gap-2">
        {imageArray.length > 0 ? (
          <div className="relative group">
            <button
              onClick={() => setIsOpen(true)}
              className="relative w-10 h-10 overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="View image"
            >
              <Image
                src={imageArray[0]}
                alt="Trade image"
                className="object-cover w-full h-full"
                width={40}
                height={40}
              />
              {imageArray.length > 1 && (
                <span className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                  {imageArray.length}
                </span>
              )}
            </button>

            {/* Add second image button - only show when there's exactly one image */}
            {imageArray.length === 1 && (
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <button
                    className="absolute -top-2 -left-2 h-5 w-5 bg-primary text-primary-foreground rounded-full hidden group-hover:flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsSecondImage(true)
                      setUploadKey(prev => prev + 1)
                      setUploadDialogOpen(true)
                    }}
                  >
                    <Upload className="h-3 w-3" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent side="top" align="center" className="text-xs">
                  Upload second image
                </HoverCardContent>
              </HoverCard>
            )}

            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <button
                  className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full hidden group-hover:flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(true)
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="top" align="center" className="text-xs">
                Delete image
              </HoverCardContent>
            </HoverCard>
          </div>
        ) : (
          <button
            onClick={handleUploadClick}
            className="relative w-10 h-10 overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Upload image"
          >
            <Upload className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
          </button>
        )}

        {imageArray.length > 0 && imageArray.length < 2 && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <button
                onClick={handleUploadClick}
                className="relative w-10 h-10 overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-muted hover:bg-muted/80 transition-colors"
                aria-label="Upload second image"
              >
                <Upload className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                <span className="absolute bottom-1 right-1 bg-primary/10 text-primary text-xs px-1 rounded">
                  +1
                </span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="center" className="text-xs">
              Upload second image
            </HoverCardContent>
          </HoverCard>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Image Gallery</DialogTitle>
          </DialogHeader>

          <div className="relative h-[70vh] sm:h-[70vh] bg-neutral-50 p-4 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 p-2 sm:p-4"
              >
                <TransformWrapper
                  initialScale={1}
                  minScale={0.5}
                  maxScale={3}
                  centerOnInit
                  limitToBounds
                  smooth
                  doubleClick={{
                    mode: "reset"
                  }}
                  onTransformed={(_, state) => {
                    setScale(state.scale)
                  }}
                >
                  {({ zoomIn, zoomOut }) => (
                    <>
                      <TransformComponent
                        wrapperClass="!w-full !h-full"
                        contentClass="!w-full !h-full flex items-center justify-center"
                      >
                        <div className="flex items-center justify-center w-full h-full">
                          <img
                            src={imageArray[selectedImageIndex]}
                            alt="Trade image"
                            className="max-w-full max-h-full object-contain select-none"
                            style={{ margin: 'auto' }}
                          />
                        </div>
                      </TransformComponent>

                      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-white/50 backdrop-blur-sm z-50">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-gradient-to-r from-white/95 to-white/90 hover:from-white hover:to-white shadow-lg border border-gray-200 ring-1 ring-gray-100 h-7 w-7 sm:h-8 sm:w-8"
                          onClick={() => zoomOut()}
                          disabled={scale <= 0.5}
                        >
                          <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
                        </Button>
                        <span className="min-w-[2.5rem] sm:min-w-[3rem] text-center text-xs sm:text-sm font-medium text-gray-700">
                          {Math.round(scale * 100)}%
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-gradient-to-r from-white/95 to-white/90 hover:from-white hover:to-white shadow-lg border border-gray-200 ring-1 ring-gray-100 h-7 w-7 sm:h-8 sm:w-8"
                          onClick={() => zoomIn()}
                          disabled={scale >= 3}
                        >
                          <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
                        </Button>
                      </div>
                    </>
                  )}
                </TransformWrapper>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="border-t p-4">
            <Carousel className="w-full">
              <CarouselContent className="w-full flex items-center justify-center gap-2">
                {imageArray.map((image, index) => (
                  <CarouselItem key={index} className="basis-auto">
                    <div 
                      className="relative aspect-square cursor-pointer"
                      onClick={() => handleThumbnailClick(index)}
                    >
                      <Image
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        width={40}
                        height={40}
                        className={cn(
                          "object-cover w-12 h-12 rounded-md transition-all",
                          selectedImageIndex === index ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50"
                        )}
                      />
                    </div>
                  </CarouselItem>
                ))}
                {imageArray.length < 2 && (
                  <CarouselItem className="basis-auto">
                    <Button
                      size={'icon'}
                      variant={'secondary'}
                      onClick={handleUploadClick}
                      className={cn("w-full aspect-square rounded-md",
                        "border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50",
                        "transition-colors flex items-center justify-center",
                        "h-12 w-12"
                      )}
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </Button>
                  </CarouselItem>
                )}
              </CarouselContent>
              {imageArray.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              Select which image you want to delete. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {trade.imageBase64 && (
              <button
                onClick={() => {
                  handleRemoveImage(false, trade.imageBase64)
                  setShowDeleteConfirm(false)
                }}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-destructive/50 hover:border-destructive transition-colors"
              >
                <Image
                  src={trade.imageBase64}
                  alt="First image"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Delete First Image</span>
                </div>
              </button>
            )}
            {trade.imageBase64Second && (
              <button
                onClick={() => {
                  handleRemoveImage(true, trade.imageBase64Second)
                  setShowDeleteConfirm(false)
                }}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-destructive/50 hover:border-destructive transition-colors"
              >
                <Image
                  src={trade.imageBase64Second}
                  alt="Second image"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Delete Second Image</span>
                </div>
              </button>
            )}
          </div>
          <div className="flex justify-between">
            <Button
              variant="destructive"
              onClick={async () => {
                await handleRemoveAllImages()
                setShowDeleteConfirm(false)
                toast.success(t('trade-table.allImagesDeleted'))
              }}
              disabled={!trade.imageBase64 && !trade.imageBase64Second}
            >
              {t('trade-table.deleteAllImages')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isSecondImage ? t('trade-table.uploadSecondImage') : t('trade-table.uploadImage')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Dropzone key={uploadKey} {...uploadProps}>
              {uploadProps.files.length > 0 ? (
                <DropzoneContent />
              ) : (
                <DropzoneEmptyState />
              )}
            </Dropzone>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

