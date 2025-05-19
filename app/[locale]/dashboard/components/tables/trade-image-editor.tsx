"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import Image from "next/image"
interface ImageGalleryProps {
  images: string | string[]
  alt?: string
  onDelete?: () => void
}

export function ImageGallery({ images, alt = "Gallery image", onDelete }: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scale, setScale] = useState(1)

  const imageArray = Array.isArray(images) ? images : [images]

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? imageArray.length - 1 : prev - 1))
    setScale(1)
  }, [imageArray.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === imageArray.length - 1 ? 0 : prev + 1))
    setScale(1)
  }, [imageArray.length])

  return (
    <>
      <div className="relative group">
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-10 h-10 overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label={`View ${alt}`}
        >
          <Image
            src={imageArray[0] || "/placeholder.svg"}
            alt={alt}
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

        {onDelete && (
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <button
                className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full hidden group-hover:flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="center" className="text-xs">
              Delete image
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
                key={currentIndex}
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
                            src={imageArray[currentIndex]}
                            alt={`${alt} ${currentIndex + 1}`}
                            className="max-w-full max-h-full object-contain select-none"
                            style={{ margin: 'auto' }}
                          />
                        </div>
                      </TransformComponent>

                      {imageArray.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 bg-gradient-to-r from-white/95 to-white/90 hover:from-white hover:to-white shadow-lg backdrop-blur-sm border border-gray-200 ring-1 ring-gray-100 z-50 h-8 w-8 sm:h-10 sm:w-10"
                            onClick={handlePrev}
                          >
                            <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6 text-gray-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 bg-gradient-to-r from-white/95 to-white/90 hover:from-white hover:to-white shadow-lg backdrop-blur-sm border border-gray-200 ring-1 ring-gray-100 z-50 h-8 w-8 sm:h-10 sm:w-10"
                            onClick={handleNext}
                          >
                            <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6 text-gray-700" />
                          </Button>
                        </>
                      )}

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
        </DialogContent>
      </Dialog>
    </>
  )
}

