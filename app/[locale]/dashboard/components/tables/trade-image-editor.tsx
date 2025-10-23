"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, X, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone";
import { useHashUpload } from "@/hooks/use-hash-upload";
import { toast } from "sonner";
import { useI18n } from "@/locales/client";
import { useUserStore } from "@/store/user-store";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { useData } from "@/context/data-provider";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const supabase = createClient();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 10; // Maximum number of images allowed
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

interface TradeImageEditorProps {
  trade: any;
  tradeIds: string[];
}

export function TradeImageEditor({ trade, tradeIds }: TradeImageEditorProps) {
  const t = useI18n();
  const user = useUserStore((state) => state.user);
  const { updateTrades } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  // Use hash-based upload hook
  const uploadProps = useHashUpload({
    bucketName: "trade-images",
    path: `${user?.id}/trades`,
    allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: MAX_IMAGES,
  });

  // Use new images array if available, otherwise fall back to legacy fields
  const imageArray =
    trade.images && trade.images.length > 0
      ? trade.images
      : [trade.imageBase64, trade.imageBase64Second].filter(Boolean);

  const uploadCallback = useCallback(async () => {
    if (uploadProps.isSuccess && uploadProps.uploadedUrls.length > 0) {
      await handleUpdateImages(uploadProps.uploadedUrls);
      setUploadDialogOpen(false);
      toast.success(t("trade-table.imageUploadSuccess"));

      // Reset upload state
      uploadProps.setFiles([]);
      uploadProps.setErrors([]);
    } else if (uploadProps.errors.length > 0) {
      const error = uploadProps.errors[0].message;
      toast.error(t("trade-table.imageUploadError", { error }));
    }
  }, [uploadProps.isSuccess, uploadProps.uploadedUrls, uploadProps.errors]);

  // Listen for successful uploads
  useEffect(() => {
    uploadCallback();
  }, [uploadProps.isSuccess, uploadProps.uploadedUrls, uploadProps.errors]);

  const handleRemoveImage = async (imageIndex: number) => {
    try {
      // Get current images array or create from legacy fields
      const currentImages =
        trade.images && trade.images.length > 0
          ? [...trade.images]
          : [trade.imageBase64, trade.imageBase64Second].filter(Boolean);

      const imageUrl = currentImages[imageIndex];

      // Update the images array by filtering out the removed image
      const newImages = currentImages.filter(
        (_, index) => index !== imageIndex,
      );

      // Update both new and legacy fields for backward compatibility
      const update: any = {
        images: newImages,
      };

      // Also update legacy fields if we're removing the first or second image
      if (imageIndex === 0) {
        update.imageBase64 = newImages[0] || null;
      }
      if (imageIndex === 1 || (imageIndex === 0 && trade.imageBase64Second)) {
        update.imageBase64Second = newImages[1] || null;
      }

      // Update trades
      await updateTrades(tradeIds, update);

      // Remove the image from Supabase storage
      if (imageUrl) {
        // Extract the path from the full URL
        const path = imageUrl.split(
          "/storage/v1/object/public/trade-images/",
        )[1];
        if (path) {
          await supabase.storage.from("trade-images").remove([path]);
        }
      }

      toast.success("Image deleted successfully");
      setImageToDelete(null);
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleRemoveAllImages = async () => {
    try {
      // Update both new and legacy fields
      const update: any = {
        images: [],
        imageBase64: null,
        imageBase64Second: null,
      };
      await updateTrades(tradeIds, update);

      // Get all images to remove from both new and legacy fields
      const imagesToRemove: string[] = [];

      // From new images array
      if (trade.images && trade.images.length > 0) {
        trade.images.forEach((imageUrl: string) => {
          const path = imageUrl.split(
            "/storage/v1/object/public/trade-images/",
          )[1];
          if (path) imagesToRemove.push(path);
        });
      }

      // From legacy fields (in case they're not in the images array)
      if (trade.imageBase64) {
        const path = trade.imageBase64.split(
          "/storage/v1/object/public/trade-images/",
        )[1];
        if (path && !imagesToRemove.includes(path)) imagesToRemove.push(path);
      }
      if (trade.imageBase64Second) {
        const path = trade.imageBase64Second.split(
          "/storage/v1/object/public/trade-images/",
        )[1];
        if (path && !imagesToRemove.includes(path)) imagesToRemove.push(path);
      }

      if (imagesToRemove.length > 0) {
        await supabase.storage.from("trade-images").remove(imagesToRemove);
      }
    } catch (error) {
      console.error("Error removing all images:", error);
    }
  };

  const handleUpdateImages = async (newUrls: string[]) => {
    console.error("handleUpdateImages called");
    // Get current images array or create from legacy fields
    const currentImages =
      trade.images && trade.images.length > 0
        ? [...trade.images]
        : [trade.imageBase64, trade.imageBase64Second].filter(Boolean);

    // Add new URLs to existing images
    const updatedImages = [...currentImages, ...newUrls];

    // Update both new and legacy fields for backward compatibility
    const update: any = {
      images: updatedImages,
      imageBase64: updatedImages[0] || null,
      imageBase64Second: updatedImages[1] || null,
    };

    await updateTrades(tradeIds, update);
  };

  const handleUploadClick = () => {
    if (imageArray.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }
    setUploadDialogOpen(true);
  };

  // Reset upload state when dialog closes
  useEffect(() => {
    if (!uploadDialogOpen) {
      uploadProps.setFiles([]);
      uploadProps.setErrors([]);
    }
  }, [uploadDialogOpen]);

  const handleThumbnailClick = (index: number) => {
    setSelectedImageIndex(index);
    setScale(1); // Reset zoom when changing images
  };

  return (
    <>
      <div className="flex gap-2">
        {imageArray.length > 0 ? (
          <div className="relative group">
            <button
              onClick={() => setIsOpen(true)}
              className="relative w-10 h-10 overflow-hidden rounded focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                  {imageArray.length < MAX_IMAGES && (
                    <button
                      className="absolute -top-2 -left-2 h-5 w-5 bg-primary text-primary-foreground rounded-full hidden group-hover:flex items-center justify-center shadow-xs hover:bg-primary/90 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUploadClick();
                      }}
                    >
                      <Upload className="h-3 w-3" />
                    </button>
                  )}
                </HoverCardTrigger>
                <HoverCardContent side="top" align="center" className="text-xs">
                  Upload second image
                </HoverCardContent>
              </HoverCard>
            )}

            <HoverCard openDelay={300}>
              <HoverCardTrigger asChild>
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full hidden group-hover:flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors duration-200 touch-action-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  aria-label="Delete images"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </HoverCardTrigger>
              <HoverCardContent side="top" align="center" className="text-xs">
                Delete Images
              </HoverCardContent>
            </HoverCard>
          </div>
        ) : (
          <button
            onClick={handleUploadClick}
            className="relative w-10 h-10 overflow-hidden rounded focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-muted hover:bg-muted/80 transition-colors"
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
                className="relative w-10 h-10 overflow-hidden rounded focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-muted hover:bg-muted/80 transition-colors"
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
                    mode: "reset",
                  }}
                  onTransformed={(_, state) => {
                    setScale(state.scale);
                  }}
                >
                  {({ zoomIn, zoomOut }) => (
                    <>
                      <TransformComponent
                        wrapperClass="w-full! h-full!"
                        contentClass="w-full! h-full! flex items-center justify-center"
                      >
                        <div className="flex items-center justify-center w-full h-full">
                          <img
                            src={imageArray[selectedImageIndex]}
                            alt="Trade image"
                            className="max-w-full max-h-full object-contain select-none"
                            style={{ margin: "auto" }}
                          />
                        </div>
                      </TransformComponent>

                      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-white/50 backdrop-blur-xs z-50">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-linear-to-r from-white/95 to-white/90 hover:from-white hover:to-white shadow-lg border border-gray-200 ring-1 ring-gray-100 h-7 w-7 sm:h-8 sm:w-8"
                          onClick={() => zoomOut()}
                          disabled={scale <= 0.5}
                        >
                          <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
                        </Button>
                        <span className="min-w-10 sm:min-w-12 text-center text-xs sm:text-sm font-medium text-gray-700">
                          {Math.round(scale * 100)}%
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-linear-to-r from-white/95 to-white/90 hover:from-white hover:to-white shadow-lg border border-gray-200 ring-1 ring-gray-100 h-7 w-7 sm:h-8 sm:w-8"
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
                {imageArray.map((image: string, index: number) => (
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
                          selectedImageIndex === index
                            ? "ring-2 ring-primary"
                            : "hover:ring-2 hover:ring-primary/50",
                        )}
                      />
                    </div>
                  </CarouselItem>
                ))}
                {imageArray.length < MAX_IMAGES && (
                  <CarouselItem className="basis-auto">
                    <Button
                      size={"icon"}
                      variant={"secondary"}
                      onClick={handleUploadClick}
                      className={cn(
                        "w-full aspect-square rounded-md",
                        "border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50",
                        "transition-colors flex items-center justify-center",
                        "h-12 w-12",
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Images</DialogTitle>
            <DialogDescription>
              Delete individual images or remove all at once. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <AnimatePresence mode="popLayout">
              {imageArray.map((imageUrl: string, index: number) => (
                <motion.div
                  key={imageUrl}
                  layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, scale: 0.8 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="group relative flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors duration-200"
                >
                  <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0 border border-border">
                    <Image
                      src={imageUrl}
                      alt={`Trade image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">Image {index + 1}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {imageUrl.split("/").pop()?.substring(0, 40)}...
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleRemoveImage(index);
                      if (imageArray.length === 1) {
                        setShowDeleteConfirm(false);
                      }
                    }}
                    className="flex-shrink-0 h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 touch-action-manipulation"
                    aria-label={`Delete image ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setImageToDelete(null);
              }}
              className="w-full sm:w-auto transition-colors duration-200"
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await handleRemoveAllImages();
                setShowDeleteConfirm(false);
                toast.success(t("trade-table.allImagesDeleted"));
              }}
              className="w-full sm:w-auto gap-2 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
              Delete All {imageArray.length} Images
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("trade-table.uploadImage")}</DialogTitle>
            <DialogDescription>
              {`Upload up to ${MAX_IMAGES - imageArray.length} more images (${imageArray.length}/${MAX_IMAGES} used)`}
            </DialogDescription>
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
    </>
  );
}
