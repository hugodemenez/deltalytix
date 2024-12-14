"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { signInWithDiscord, signInWithEmail } from "@/server/auth"
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

const formSchema = z.object({
    email: z.string().email(),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

// Add a type for auth method
type AuthMethod = 'email' | 'discord' | null

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [isEmailSent, setIsEmailSent] = React.useState<boolean>(false)
    const [countdown, setCountdown] = React.useState<number>(0)
    const [isSubscription, setIsSubscription] = React.useState<boolean>(false)
    const [lookupKey, setLookupKey] = React.useState<string | null>(null)
    // Add state for tracking auth method
    const [authMethod, setAuthMethod] = React.useState<AuthMethod>(null)
    const t = useI18n()

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const subscription = urlParams.get('subscription')
        setIsSubscription(subscription === 'true')
        const lookup_key = urlParams.get('lookup_key')
        setLookupKey(lookup_key)
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

    async function onSubmitEmail(values: z.infer<typeof formSchema>) {
        if (countdown > 0) return
        
        setIsLoading(true)
        setAuthMethod('email')
        try {
            await signInWithEmail(values.email, isSubscription ? `api/stripe/create-checkout-session?lookup_key=${lookupKey}` : null)
            setIsEmailSent(true)
            setCountdown(15)
        } catch (error) {
            console.error(error)
            setAuthMethod(null)
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmitDiscord(event: React.SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)
        setAuthMethod('discord')

        try {
            await signInWithDiscord(isSubscription ? `api/stripe/create-checkout-session?lookup_key=${lookupKey}` : null)
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
            window.open('https://mail.google.com', '_blank')
        } else if (
            domain?.includes('outlook.com') || 
            domain?.includes('hotmail.com') || 
            domain?.includes('live.com') ||
            domain?.includes('msn.com') ||
            domain?.includes('office365.com')
        ) {
            window.open('https://outlook.live.com', '_blank')
        } else if (
            domain?.includes('proton.me') || 
            domain?.includes('protonmail.com') || 
            domain?.includes('pm.me')
        ) {
            window.open('https://mail.proton.me', '_blank')
        } else if (
            domain?.includes('icloud.com') || 
            domain?.includes('me.com') || 
            domain?.includes('mac.com')
        ) {
            window.open('https://www.icloud.com/mail', '_blank')
        } else if (domain?.includes('yahoo.com')) {
            window.open('https://mail.yahoo.com', '_blank')
        } else if (domain?.includes('aol.com')) {
            window.open('https://mail.aol.com', '_blank')
        } else if (domain?.includes('zoho.com')) {
            window.open('https://mail.zoho.com', '_blank')
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
                                        disabled={isLoading || isEmailSent || authMethod === 'discord'}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {!isEmailSent ? (
                        <Button 
                            disabled={isLoading || countdown > 0 || authMethod === 'discord'}
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
                                disabled={authMethod === 'discord'}
                            >
                                <Icons.envelope className="mr-2 h-4 w-4" />
                                {t('auth.openMailbox')}
                            </Button>
                            <Button
                                type="submit"
                                variant="ghost"
                                className="w-full"
                                disabled={countdown > 0 || authMethod === 'discord'}
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
        </div>
    )
}