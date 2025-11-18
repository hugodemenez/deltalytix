"use client"

import { signInWithDiscord, signInWithEmail, verifyOtp, signInWithGoogle, signInWithPasswordAction } from "@/server/auth"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { z } from 'zod';
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
import { useI18n, useCurrentLocale } from "@/locales/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator
} from "@/components/ui/input-otp"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
// Link removed; unauthenticated users can't reach settings
import { useAuthPreferenceStore } from "@/store/auth-preference-store"

const formSchema = z.object({
    email: z.string().email(),
    password: z.union([
        z.string().min(6, 'Password must be at least 6 characters'),
        z.literal('')
    ]).optional(),
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
    const [referralCode, setReferralCode] = React.useState<string | null>(null)
    const [promoCode, setPromoCode] = React.useState<string | null>(null)
    const [authMethod, setAuthMethod] = React.useState<AuthMethod>(null)
    const [showOtpInput, setShowOtpInput] = React.useState<boolean>(false)
    const [nextUrl, setNextUrl] = React.useState<string | null>(null)
    const router = useRouter()
    const { lastAuthPreference, setLastAuthPreference } = useAuthPreferenceStore()
    const [tab, setTab] = React.useState<'magic' | 'password'>(lastAuthPreference)
    const t = useI18n()
    const locale = useCurrentLocale()

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const subscription = urlParams.get('subscription')
        const next = urlParams.get('next')
        const referral = urlParams.get('referral')
        const promo_code = urlParams.get('promo_code')
        setIsSubscription(subscription === 'true')
        const lookup_key = urlParams.get('lookup_key')
        setLookupKey(lookup_key)
        setNextUrl(next)
        
        // Get promo code from URL
        if (promo_code) {
            setPromoCode(promo_code)
        }
        
        // Get referral code from URL or localStorage
        if (referral) {
            setReferralCode(referral)
        } else {
            import('@/lib/referral-storage').then(({ getReferralCode }) => {
                const storedRef = getReferralCode()
                if (storedRef) {
                    setReferralCode(storedRef)
                }
            })
        }
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
            password: "",
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
            const referralParam = referralCode ? `&referral=${encodeURIComponent(referralCode)}` : '';
            const promoParam = promoCode ? `&promo_code=${encodeURIComponent(promoCode)}` : '';
            const next = isSubscription 
                ? `api/stripe/create-checkout-session?lookup_key=${lookupKey}${referralParam}${promoParam}` 
                : nextUrl;
            await signInWithEmail(values.email, next, locale)
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

    // Helper function to parse Supabase errors and return user-friendly messages
    function parseAuthError(error: unknown): { message: string; field?: 'email' | 'password' } {
        if (!(error instanceof Error)) {
            return { message: t('auth.errors.signInFailed') }
        }

        const errorMessage = error.message.toLowerCase()

        // Password validation errors
        if (errorMessage.includes('password should contain') || 
            errorMessage.includes('password must contain') ||
            errorMessage.includes('password requirements')) {
            return {
                message: t('auth.errors.passwordTooWeak'),
                field: 'password'
            }
        }

        if (errorMessage.includes('password must be at least') ||
            errorMessage.includes('password is too short')) {
            return {
                message: t('auth.errors.passwordMinLength'),
                field: 'password'
            }
        }

        // Account exists but password is wrong or not set yet
        if (errorMessage.includes('invalid_credentials_or_no_password') ||
            errorMessage.includes('password is incorrect, or this account doesn\'t have a password set')) {
            return {
                message: t('auth.errors.invalidCredentialsOrNoPassword'),
                field: 'password'
            }
        }

        // Email/credential errors (generic - check this after specific cases)
        if (errorMessage.includes('invalid login credentials') ||
            errorMessage.includes('invalid_credentials') ||
            errorMessage.includes('invalid email or password')) {
            return {
                message: t('auth.errors.invalidCredentials'),
                field: 'password'
            }
        }

        if (errorMessage.includes('email not confirmed') ||
            errorMessage.includes('email_not_confirmed')) {
            return {
                message: t('auth.errors.emailNotConfirmed'),
                field: 'email'
            }
        }

        if (errorMessage.includes('user not found') ||
            errorMessage.includes('no user found')) {
            return {
                message: t('auth.errors.userNotFound'),
                field: 'email'
            }
        }

        if (errorMessage.includes('already registered') ||
            errorMessage.includes('user already registered')) {
            return {
                message: t('auth.errors.accountExists'),
                field: 'email'
            }
        }

        // Account exists but no password set (created via magic link)
        // Password reset email has been sent
        if (errorMessage.includes('account_exists_no_password') ||
            errorMessage.includes('doesn\'t have a password set') ||
            errorMessage.includes('password reset email has been sent')) {
            return {
                message: t('auth.errors.accountExistsNoPasswordResetSent'),
                field: 'email'
            }
        }

        // Default: return the original error message but make it more user-friendly
        return {
            message: error.message || t('auth.errors.signInFailed')
        }
    }

    async function onSubmitPassword(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        setAuthMethod('email')
        try {
            await signInWithPasswordAction(values.email, values.password || '')
            toast.success(t('success'), { description: t('auth.signIn') })
            router.refresh()
            router.push(nextUrl || '/dashboard')
            setLastAuthPreference('password')
        } catch (error) {
            console.error(error)
            const parsedError = parseAuthError(error)
            
            // Set form field error if applicable
            if (parsedError.field === 'password') {
                form.setError('password', {
                    type: 'manual',
                    message: parsedError.message
                })
            } else if (parsedError.field === 'email') {
                form.setError('email', {
                    type: 'manual',
                    message: parsedError.message
                })
            }
            
            // Show toast with user-friendly message
            toast.error(t('error'), {
                description: parsedError.message,
            })
            setAuthMethod(null)
        } finally {
            setIsLoading(false)
        }
    }

    // Signup handled via magic link; no password signup flow here

    async function onSubmitOtp(values: z.infer<typeof otpFormSchema>) {
        setIsLoading(true)
        try {
            const email = form.getValues('email')
            await verifyOtp(email, values.otp)
            toast.success("Successfully verified. Redirecting...", {
                description: "Successfully verified. Redirecting...",
            })
            router.refresh()
            router.push(nextUrl || '/dashboard')
        } catch (error) {
            console.error(error)
            toast.error("Error", {
                description: error instanceof Error ? error.message : "Failed to verify code",
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
            const referralParam = referralCode ? `&referral=${encodeURIComponent(referralCode)}` : '';
            const promoParam = promoCode ? `&promo_code=${encodeURIComponent(promoCode)}` : '';
            const next = isSubscription 
                ? `api/stripe/create-checkout-session?lookup_key=${lookupKey}${referralParam}${promoParam}` 
                : nextUrl;
            await signInWithDiscord(next, locale)
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
            const referralParam = referralCode ? `&referral=${encodeURIComponent(referralCode)}` : '';
            const promoParam = promoCode ? `&promo_code=${encodeURIComponent(promoCode)}` : '';
            const next = isSubscription 
                ? `api/stripe/create-checkout-session?lookup_key=${lookupKey}${referralParam}${promoParam}` 
                : nextUrl;
            await signInWithGoogle(next, locale)
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
            <Tabs value={tab} onValueChange={(v) => { setTab(v as 'magic' | 'password'); setLastAuthPreference(v as 'magic' | 'password'); }}>
                <TabsList className="flex w-full overflow-x-auto gap-1 sm:grid sm:grid-cols-2 sm:gap-0">
                    <TabsTrigger value="magic" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-1">
                        <span className="truncate">{t('auth.tabs.magic')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="password" className="relative flex-1 min-w-0 text-xs sm:text-sm px-2 py-1">
                        <span className="truncate">{t('auth.tabs.password')}</span>
                        <Badge
                            variant="secondary"
                            className="hidden sm:inline-flex absolute -top-1 -right-1 text-[9px] leading-3 px-1 py-0.5"
                        >
                            {t('auth.new')}
                        </Badge>
                    </TabsTrigger>
                    {/* Signup tab removed: handled by Magic Link */}
                </TabsList>

                <TabsContent value="magic">
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
                                        disabled={isLoading || (isEmailSent || authMethod === 'discord' || authMethod === 'google')}
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
            {/* Hint removed: settings not accessible unauthenticated */}
                </TabsContent>

                <TabsContent value="password">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitPassword)} className="grid gap-2">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Email</FormLabel>
                                <FormControl>
                                    <Input
                                        id="email_password"
                                        placeholder={t('auth.emailPlaceholder')}
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        disabled={isLoading}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Password</FormLabel>
                                <FormControl>
                                    <Input
                                        id="password_login"
                                        placeholder={t('auth.passwordPlaceholder')}
                                        type="password"
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button disabled={isLoading} type="submit">
                        {isLoading && authMethod === 'email' && (
                            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {t('auth.signInWithPassword')}
                    </Button>
                </form>
                </Form>
                </TabsContent>

                {/* Signup content removed */}
            </Tabs>

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