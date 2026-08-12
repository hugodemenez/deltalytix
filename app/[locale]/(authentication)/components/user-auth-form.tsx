"use client"

import { signInWithDiscord, signInWithEmail, verifyOtp, signInWithGoogle, signInWithPasswordAction } from "@/server/auth"

import * as React from "react"
import { ArrowLeft } from "lucide-react"
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
// Link removed; unauthenticated users can't reach settings
import { useAuthPreferenceStore } from "@/store/auth-preference-store"
import { openMailbox } from "@/lib/open-mailbox"
import { signupRedirectPath } from "@/lib/signup-redirect"

/* Landing-page control language: rounded-sm, hairline borders, no shadows, a
   filled oklch primary and hover washes instead of accent fills. Mirrors the
   hero CTAs in app/[locale]/(landing)/components/hero.tsx. */
const PRIMARY_ACTION =
    "h-11 w-full rounded-sm bg-[oklch(0.22_0.01_95)] text-sm font-medium text-white shadow-none transition-[opacity,transform] duration-150 hover:bg-[oklch(0.22_0.01_95)] hover:opacity-85 active:scale-[0.96] disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)] dark:hover:bg-[oklch(0.94_0.01_95)]"

const SECONDARY_ACTION =
    "h-11 w-full rounded-sm border border-black/20 bg-transparent text-sm font-medium shadow-none transition-[colors,transform] duration-150 hover:bg-black/5 active:scale-[0.96] disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5"

const OTP_SLOT =
    "h-11 w-11 rounded-sm border-black/10 text-base shadow-none first:rounded-l-sm last:rounded-r-sm dark:border-white/10"

const FIELD =
    "h-11 rounded-sm border-black/10 bg-transparent shadow-none placeholder:text-black/40 focus-visible:ring-1 focus-visible:ring-black/25 focus-visible:ring-offset-0 dark:border-white/10 dark:placeholder:text-white/40 dark:focus-visible:ring-white/25"

const formSchema = z.object({
    email: z.string().email(),
    password: z.union([
        z.string().min(6, 'Password must be at least 6 characters'),
        z.literal('')
    ]).optional(),
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
    const [usePassword, setUsePassword] = React.useState<boolean>(lastAuthPreference === 'password')
    const [otp, setOtp] = React.useState<string>("")
    /* Ref rather than state: the auto-verify guard has to be correct within a
       single change event, before a state update could land. */
    const isVerifyingRef = React.useRef(false)
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

    /* Sending the link locks the email field, so there has to be a way back out —
       to fix a typo, or to switch to password sign-in instead. */
    function resetEmailFlow() {
        setIsEmailSent(false)
        setShowOtpInput(false)
        setOtp("")
        setCountdown(0)
        setAuthMethod(null)
    }

    function toggleUsePassword() {
        const next = !usePassword
        setUsePassword(next)
        setLastAuthPreference(next ? 'password' : 'magic')
        if (!next) form.setValue('password', '')
    }

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
        /* The schema keeps password optional because the email flow shares it, so
           the empty case has to be caught here rather than at the server. */
        if (!values.password) {
            form.setError('password', {
                type: 'manual',
                message: t('auth.passwordMinLength'),
            })
            return
        }
        setIsLoading(true)
        setAuthMethod('email')
        try {
            const result = await signInWithPasswordAction(values.email, values.password || '')
            toast.success(t('success'), { description: t('auth.signIn') })
            router.refresh()
            // This action doubles as registration when the account does not
            // exist yet, so it can legitimately return a brand-new user.
            router.push(signupRedirectPath(nextUrl, result?.isNewUser ?? false))
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

    async function verifyCode(code: string) {
        if (isVerifyingRef.current) return
        isVerifyingRef.current = true
        setIsLoading(true)
        try {
            const email = form.getValues('email')
            const result = await verifyOtp(email, code)
            toast.success("Successfully verified. Redirecting...", {
                description: "Successfully verified. Redirecting...",
            })
            router.refresh()
            router.push(signupRedirectPath(nextUrl, result?.isNewUser ?? false))
        } catch (error) {
            console.error(error)
            toast.error("Error", {
                description: error instanceof Error ? error.message : "Failed to verify code",
            })
            /* Clear so the next keystroke can re-trigger auto-verify. */
            setOtp("")
        } finally {
            isVerifyingRef.current = false
            setIsLoading(false)
        }
    }

    /* No submit button: the code is fixed-length, so verify as soon as it's complete. */
    function onOtpChange(value: string) {
        setOtp(value)
        if (value.length === 6) verifyCode(value)
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
        const result = openMailbox(email)

        if (result === 'manual-check') {
            toast.info(t('auth.openMailboxManualCheck'))
        }
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(usePassword && !isEmailSent ? onSubmitPassword : onSubmitEmail)}
                    className="grid gap-3"
                >
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Email</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            id="email"
                                            className={cn(FIELD, isEmailSent && "pr-11")}
                                            placeholder={t('auth.emailPlaceholder')}
                                            type="email"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            autoCorrect="off"
                                            disabled={isLoading || isEmailSent || authMethod === 'discord' || authMethod === 'google'}
                                            {...field}
                                        />
                                    </FormControl>
                                    {isEmailSent && (
                                        <button
                                            type="button"
                                            onClick={resetEmailFlow}
                                            aria-label={t('auth.changeEmail')}
                                            title={t('auth.changeEmail')}
                                            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-sm text-black/45 transition-colors duration-150 hover:bg-black/5 hover:text-black dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white"
                                        >
                                            <ArrowLeft className="h-4 w-4" aria-hidden />
                                        </button>
                                    )}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Progressive disclosure instead of tabs. A 0fr->1fr grid row is
                        animatable where height:auto is not, so the reveal doesn't snap. */}
                    <div
                        aria-hidden={!usePassword}
                        className={cn(
                            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                            usePassword ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                        )}
                    >
                        <div className="overflow-hidden">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="sr-only">{t('auth.password')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                id="password_login"
                                                className={FIELD}
                                                placeholder={t('auth.passwordPlaceholder')}
                                                type="password"
                                                autoComplete="current-password"
                                                disabled={isLoading || !usePassword}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {!isEmailSent ? (
                        <>
                            <Button
                                className={PRIMARY_ACTION}
                                disabled={isLoading || countdown > 0 || authMethod === 'discord' || authMethod === 'google'}
                                type="submit"
                            >
                                {isLoading && authMethod === 'email' && (
                                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {usePassword ? t('auth.signInWithPassword') : t('auth.signInWithEmail')}
                            </Button>
                            <button
                                type="button"
                                onClick={toggleUsePassword}
                                className="justify-self-center rounded-sm text-sm text-black/55 underline underline-offset-4 transition-colors duration-150 hover:text-black dark:text-white/55 dark:hover:text-white"
                            >
                                {usePassword ? t('auth.useMagicLink') : t('auth.usePassword')}
                            </button>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className={SECONDARY_ACTION}
                                onClick={openMailClient}
                                disabled={authMethod === 'discord' || authMethod === 'google'}
                            >
                                <Icons.envelope className="mr-2 h-4 w-4" />
                                {t('auth.openMailbox')}
                            </Button>
                            <Button
                                type="submit"
                                variant="outline"
                                className={SECONDARY_ACTION}
                                disabled={countdown > 0 || authMethod === 'discord' || authMethod === 'google'}
                            >
                                {countdown > 0
                                    ? `${t('auth.resendIn')} ${countdown}s`
                                    : t('auth.resendEmail')}
                            </Button>
                        </div>
                    )}
                </form>
            </Form>

            {showOtpInput && (
                <div className="grid gap-3">
                    <p className="text-center text-sm text-black/55 dark:text-white/55">
                        {t('auth.verificationCode')}
                    </p>
                    <div className="flex justify-center">
                        <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={onOtpChange}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} className={OTP_SLOT} />
                                <InputOTPSlot index={1} className={OTP_SLOT} />
                                <InputOTPSlot index={2} className={OTP_SLOT} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                                <InputOTPSlot index={3} className={OTP_SLOT} />
                                <InputOTPSlot index={4} className={OTP_SLOT} />
                                <InputOTPSlot index={5} className={OTP_SLOT} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>
                </div>
            )}

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-black/10 dark:border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                    {/* bg matches the panel, not --background, or the label sits on a grey chip. */}
                    <span className="bg-card px-3 text-black/45 dark:text-white/45">
                        {t('auth.continueWith')}
                    </span>
                </div>
            </div>

            <div className="grid gap-3">
                <Button
                    variant="outline"
                    type="button"
                    className={SECONDARY_ACTION}
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
                    className={SECONDARY_ACTION}
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
        </div>
    )
}
