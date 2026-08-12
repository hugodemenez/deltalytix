import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/locales/landing-client";
import { useCallback, useEffect, useState } from "react";
import { sendSupportEmail } from "../../actions/send-support-email";
import { UIMessage } from "@ai-sdk/react";
import { createClient } from "@/lib/supabase";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function SupportForm({
    open,
    onOpenChange,
    summary,
    locale,
    messages,
    setMessages,
    onCancel,
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    /** Sent with the request but never shown — the assistant owns this text. */
    summary: string,
    locale: 'en' | 'fr',
    messages: UIMessage[],
    setMessages: (messages: UIMessage[]) => void,
    onCancel?: () => void
}) {
    const t = useI18n()
    const isDesktop = useMediaQuery("(min-width: 640px)")
    const [isSendingEmail, setIsSendingEmail] = useState(false)
    const [sessionName, setSessionName] = useState('')
    const [sessionEmail, setSessionEmail] = useState('')
    const [email, setEmail] = useState('')
    const [additionalInfo, setAdditionalInfo] = useState('')
    const supabase = createClient()

    useEffect(() => {
        // Prefill from the session when there is one — the support page is public.
        const fetchUser = async () => {
            if (!supabase) return

            const { data, error } = await supabase.auth.getUser()
            if (error || !data.user) return

            setSessionName(data.user.user_metadata?.full_name || '')
            setSessionEmail(data.user.email || '')
        }
        fetchUser()
    }, [supabase])

    // Only ask for an email when the session did not already give us one.
    const hasSessionEmail = Boolean(sessionEmail)
    const effectiveEmail = hasSessionEmail ? sessionEmail : email

    const handleSendEmail = useCallback(async () => {
        if (isSendingEmail) return

        setIsSendingEmail(true)
        try {
            const name = sessionName || effectiveEmail.split('@')[0] || ''
            const contactInfo = { name, email: effectiveEmail, additionalInfo, locale }
            const result = await sendSupportEmail({
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.parts.filter(part => part.type === 'text').map(part => part.text).join('')
                })),
                summary,
                contactInfo,
            })
            if (result.success) {
                toast.success(t('support.emailSent'), {
                    description: t('success'),
                    duration: 5000,
                })
                setMessages([
                    ...messages,
                    {
                        id: Date.now().toString(),
                        role: 'assistant',
                        parts: [{
                            type: 'text',
                            text: t('support.emailConfirmation', { name: contactInfo.name, email: contactInfo.email })
                        }]
                    }
                ])
                onOpenChange(false)
            } else {
                throw new Error(result.error)
            }
        } catch (error) {
            console.error('Error sending email:', error)
            toast.error(t('support.emailError'), {
                description: t('error'),
                duration: 5000,
            })
        } finally {
            setIsSendingEmail(false)
        }
    }, [isSendingEmail, messages, setMessages, t, sessionName, effectiveEmail, additionalInfo, locale, summary, onOpenChange])

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleSendEmail()
    }

    const form = (
        <form
            onSubmit={handleFormSubmit}
            className={isDesktop ? "space-y-4" : "space-y-4 px-4 pb-6"}
        >
            {!hasSessionEmail && (
                <div>
                    <Label htmlFor="email">{t('support.form.email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
            )}
            <div>
                <Label htmlFor="additionalInfo">{t('support.form.additionalInfo')}</Label>
                <Textarea
                    id="additionalInfo"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder={t('support.form.additionalInfoPlaceholder')}
                />
            </div>
            <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                    onOpenChange(false);
                    onCancel?.();
                }}>
                    {t('support.form.cancel')}
                </Button>
                <Button type="submit" disabled={isSendingEmail}>
                    {isSendingEmail ? t('support.form.sending') : t('support.form.submit')}
                </Button>
            </div>
        </form>
    )

    if (!isDesktop) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <DrawerHeader className="text-left">
                        <DrawerTitle>{t('support.contactInformation')}</DrawerTitle>
                        <DrawerDescription>
                            {t('support.contactInformationDescription')}
                        </DrawerDescription>
                    </DrawerHeader>
                    {form}
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('support.contactInformation')}</DialogTitle>
                    <DialogDescription>
                        {t('support.contactInformationDescription')}
                    </DialogDescription>
                </DialogHeader>
                {form}
            </DialogContent>
        </Dialog>
    )
}
