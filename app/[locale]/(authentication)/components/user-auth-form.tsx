"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { signInWithDiscord, signInWithEmail, verifyOtp, signInWithGoogle } from "@/server/auth"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { useI18n } from "@/locales/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator
} from "@/components/ui/input-otp"

const formSchema = z.object({
    email: z.string().email(),
})

const otpFormSchema = z.object({
    otp: z.string().length(6, "Verification code must be 6 digits"),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

type AuthMethod = 'email' | 'discord' | 'google' | null

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [isEmailSent, setIsEmailSent] = React.useState<boolean>(false)
    const [countdown, setCountdown] = React.useState<number>(0)
    const [isSubscription, setIsSubscription] = React.useState<boolean>(false)
    const [lookupKey, setLookupKey] = React.useState<string | null>(null)
    const [authMethod, setAuthMethod] = React.useState<AuthMethod>(null)
    const [showOtpInput, setShowOtpInput] = React.useState<boolean>(false)
    const [nextUrl, setNextUrl] = React.useState<string | null>(null)
    const router = useRouter()
    const t = useI18n()

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const subscription = urlParams.get('subscription')
        const next = urlParams.get('next')
        setIsSubscription(subscription === 'true')
        const lookup_key = urlParams.get('lookup_key')
        setLookupKey(lookup_key)
        setNextUrl(next)
    }, [])

    React.useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    })

    const otpForm = useForm<z.infer<typeof otpFormSchema>>({
        resolver: zodResolver(otpFormSchema),
        defaultValues: {
            otp: "",
        },
    })

    async function onSubmitEmail(values: z.infer<typeof formSchema>) {
        if (countdown > 0) return
        
        setIsLoading(true)
        setAuthMethod('email')
        try {
            await signInWithEmail(values.email, isSubscription ? `api/stripe/create-checkout-session?lookup_key=${lookupKey}` : nextUrl)
            setIsEmailSent(true)
            setShowOtpInput(true)
            setCountdown(15)
        } catch (error) {
            console.error(error)
            setAuthMethod(null)
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmitOtp(values: z.infer<typeof otpFormSchema>) {
        setIsLoading(true)
        try {
            const email = form.getValues('email')
            await verifyOtp(email, values.otp)
            toast({
                title: "Success",
                description: "Successfully verified. Redirecting...",
            })
            router.refresh()
            router.push(nextUrl || '/dashboard')
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to verify code",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmitDiscord(event: React.SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)
        setAuthMethod('discord')

        try {
            await signInWithDiscord(isSubscription ? `api/stripe/create-checkout-session?lookup_key=${lookupKey}` : nextUrl)
        } catch (error) {
            console.error(error)
            setAuthMethod(null)
            setIsLoading(false)
        }
    }

    async function onSubmitGoogle(event: React.SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)
        setAuthMethod('google')

        try {
            await signInWithGoogle(isSubscription ? `api/stripe/create-checkout-session?lookup_key=${lookupKey}` : nextUrl)
        } catch (error) {
            console.error(error)
            setAuthMethod(null)
            setIsLoading(false)
        }
    }

    function openMailClient() {
        const email = form.getValues('email')
        const domain = email.split('@')[1]?.toLowerCase()

        if (domain?.includes('gmail.com')) {
            window.open('https://mail.google.com', '_blank', 'noopener,noreferrer')
        } else if (
            domain?.includes('outlook.com') || 
            domain?.includes('hotmail.com') || 
            domain?.includes('live.com') ||
            domain?.includes('msn.com') ||
            domain?.includes('office365.com')
        ) {
            window.open('https://outlook.live.com', '_blank', 'noopener,noreferrer')
        } else if (
            domain?.includes('proton.me') || 
            domain?.includes('protonmail.com') || 
            domain?.includes('pm.me')
        ) {
            window.open('https://mail.proton.me', '_blank', 'noopener,noreferrer')
        } else if (
            domain?.includes('icloud.com') || 
            domain?.includes('me.com') || 
            domain?.includes('mac.com')
        ) {
            window.open('https://www.icloud.com/mail', '_blank', 'noopener,noreferrer')
        } else if (domain?.includes('yahoo.com')) {
            window.open('https://mail.yahoo.com', '_blank', 'noopener,noreferrer')
        } else if (domain?.includes('aol.com')) {
            window.open('https://mail.aol.com', '_blank', 'noopener,noreferrer')
        } else if (domain?.includes('zoho.com')) {
            window.open('https://mail.zoho.com', '_blank', 'noopener,noreferrer')
        } else {
            // Default to mailto: for unknown domains
            window.location.href = `mailto:${email}`
        }
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitEmail)} className="grid gap-2">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Email</FormLabel>
                                <FormControl>
                                    <Input
                                        id="email"
                                        placeholder={t('auth.emailPlaceholder')}
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        disabled={isLoading || isEmailSent || authMethod === 'discord' || authMethod === 'google'}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {!isEmailSent ? (
                        <Button 
                            disabled={isLoading || countdown > 0 || authMethod === 'discord' || authMethod === 'google'}
                            type="submit"
                        >
                            {isLoading && authMethod === 'email' && (
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {t('auth.signInWithEmail')}
                        </Button>
                    ) : (
                        <div className="space-y-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full"
                                onClick={openMailClient}
                                disabled={authMethod === 'discord' || authMethod === 'google'}
                            >
                                <Icons.envelope className="mr-2 h-4 w-4" />
                                {t('auth.openMailbox')}
                            </Button>
                            <Button
                                type="submit"
                                variant="ghost"
                                className="w-full"
                                disabled={countdown > 0 || authMethod === 'discord' || authMethod === 'google'}
                            >
                                {countdown > 0 ? (
                                    `${t('auth.resendIn')} ${countdown}s`
                                ) : (
                                    t('auth.resendEmail')
                                )}
                            </Button>
                        </div>
                    )}
                </form>
            </Form>

            {showOtpInput && (
                <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} className="space-y-4">
                        <FormField
                            control={otpForm.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-center block">{t('auth.verificationCode')}</FormLabel>
                                    <FormControl>
                                        <div className="flex justify-center">
                                            <InputOTP
                                                maxLength={6}
                                                value={field.value}
                                                onChange={field.onChange}
                                                className="gap-2"
                                            >
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={0} />
                                                    <InputOTPSlot index={1} />
                                                    <InputOTPSlot index={2} />
                                                </InputOTPGroup>
                                                <InputOTPSeparator />
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={3} />
                                                    <InputOTPSlot index={4} />
                                                    <InputOTPSlot index={5} />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-center" />
                                </FormItem>
                            )}
                        />
                        <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t('auth.verifyCode')}
                        </Button>
                    </form>
                </Form>
            )}

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        {t('auth.continueWith')}
                    </span>
                </div>
            </div>
            <Button 
                variant="outline" 
                type="button" 
                disabled={isLoading || authMethod === 'email'} 
                onClick={onSubmitDiscord}
            >
                {isLoading && authMethod === 'discord' ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Icons.discord className="mr-2 h-4 w-4" />
                )}{" "}
                {t('auth.signInWithDiscord')}
            </Button>
            <Button 
                variant="outline" 
                type="button" 
                disabled={isLoading || authMethod === 'email'} 
                onClick={onSubmitGoogle}
            >
                {isLoading && authMethod === 'google' ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                )}{" "}
                {t('auth.signInWithGoogle')}
            </Button>
        </div>
    )
}