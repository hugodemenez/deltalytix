'use client'

import { useState } from 'react'
import { PostType } from '@/prisma/generated/prisma/browser'
import { createPost } from '@/app/[locale]/(landing)/actions/community'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/locales/client'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod';
import { toast } from 'sonner'
import { ImagePlus, X } from 'lucide-react'
import Image from 'next/image'
import { AuthPrompt } from './auth-prompt'
import { useUserStore } from '@/store/user-store'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const formSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  type: z.enum(PostType),
  screenshots: z.array(z.string()).max(3, 'Maximum 3 screenshots allowed'),
})

type Props = {
  children: React.ReactNode
}

export function CreatePost({ children }: Props) {
  const t = useI18n()
  const router = useRouter()
  const user = useUserStore(state => state.user)
  const [open, setOpen] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      type: PostType.FEATURE_REQUEST,
      screenshots: [],
    },
  })

  async function handleImageUpload(file: File) {
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('community.createPost.imageSizeError'))
      return
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('community.createPost.imageTypeError'))
      return
    }

    setIsUploading(true)

    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        const currentScreenshots = form.getValues('screenshots')
        
        if (currentScreenshots.length >= 3) {
          toast.error(t('community.createPost.maxScreenshots'))
          return
        }

        form.setValue('screenshots', [...currentScreenshots, base64String])
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error(t('community.createPost.error'))
    } finally {
      setIsUploading(false)
    }
  }

  function removeScreenshot(index: number) {
    const currentScreenshots = form.getValues('screenshots')
    form.setValue('screenshots', currentScreenshots.filter((_, i) => i !== index))
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createPost(values)
      setOpen(false)
      form.reset()
      router.refresh()
      toast.success(t('community.createPost.success'))
    } catch (error) {
      toast.error(t('community.createPost.error'))
    }
  }

  function handleDialogOpen(value: boolean) {
    if (!user && value) {
      setShowAuthPrompt(true)
      return
    }
    setOpen(value)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('community.createPost.title')}</DialogTitle>
            <DialogDescription>
              {t('community.createPost.description')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('community.createPost.type')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('community.createPost.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PostType.FEATURE_REQUEST}>
                          {t('community.types.featureRequest')}
                        </SelectItem>
                        <SelectItem value={PostType.BUG_REPORT}>
                          {t('community.types.bugReport')}
                        </SelectItem>
                        <SelectItem value={PostType.DISCUSSION}>
                          {t('community.types.discussion')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('community.createPost.postTitle')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('community.createPost.titlePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('community.createPost.content')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('community.createPost.contentPlaceholder')}
                        className="resize-none text-lg sm:text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="screenshots"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('community.createPost.screenshots')}</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {(field.value ?? []).map((screenshot, index) => (
                            <div key={index} className="relative">
                              <Image
                                src={screenshot}
                                alt={`Screenshot ${index + 1}`}
                                width={100}
                                height={100}
                                className="rounded-md object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={() => removeScreenshot(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {(field.value?.length ?? 0) < 3 && (
                          <div className="flex items-center">
                            <Input
                              type="file"
                              accept={ACCEPTED_IMAGE_TYPES.join(',')}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleImageUpload(file)
                                e.target.value = ''
                              }}
                              className="hidden"
                              id="screenshot-upload"
                              disabled={isUploading}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              asChild
                              className="w-full"
                              disabled={isUploading}
                            >
                              <label htmlFor="screenshot-upload" className="cursor-pointer">
                                <ImagePlus className="mr-2 h-4 w-4" />
                                {t('community.createPost.addScreenshot')}
                              </label>
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                {t('community.createPost.createButton')}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AuthPrompt 
        open={showAuthPrompt}
        onOpenChange={setShowAuthPrompt}
        action={t('community.actions.createPost')}
      />
    </>
  )
} 