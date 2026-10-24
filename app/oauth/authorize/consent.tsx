import { ArrowLeftRight, Eye, LayoutGrid, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isWriteScope, redirectHost, SCOPE_PLAIN_LABELS } from "@/app/[locale]/dashboard/settings/connections-format"
import type { ApiScope } from "@/lib/api/scopes"
import {
  approveAuthorizationAction,
  denyAuthorizationAction,
  switchAccountAction,
} from "./actions"

type Props = {
  email: string
  app: {
    id: string
    name: string
    description: string | null
    logoUrl: string | null
    clientId: string
  }
  scopes: { id: string; description: string }[]
  redirectUri: string
  state?: string
  codeChallenge?: string
  codeChallengeMethod?: string
  resource?: string
  scopeValue: string
  /** Relative `oauth/authorize?…` target to come back to after switching account. */
  switchAccountNext?: string
  locale?: "en" | "fr"
}

const SWITCH_ACCOUNT_LABEL = {
  en: "Use another account",
  fr: "Changer de compte",
} as const

function scopeLabel(scope: { id: string; description: string }): string {
  if (scope.id in SCOPE_PLAIN_LABELS) {
    return SCOPE_PLAIN_LABELS[scope.id as ApiScope]
  }
  return scope.description
}

export function AuthorizeConsent({
  email,
  app,
  scopes,
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
  resource,
  scopeValue,
  switchAccountNext,
  locale = "en",
}: Props) {
  const host = redirectHost(redirectUri)

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#FAFAFA] px-4 py-14 text-[#171717]">
      <p className="mb-6 text-[15px] font-semibold tracking-tight">Deltalytix</p>
      <div className="w-full max-w-[420px] rounded-[4px] border border-[#E5E5E5] bg-white px-6 pb-6 pt-7">
        <div className="mb-[18px] flex items-center justify-center gap-2.5 text-[#A3A3A3]">
          {app.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.logoUrl}
              alt=""
              className="size-10 rounded-[6px] border border-[#E5E5E5] object-cover"
            />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-[6px] border border-[#E5E5E5] bg-[#F5F5F5] text-[#404040]">
              <LayoutGrid className="size-3.5" />
            </span>
          )}
          <ArrowLeftRight className="size-4" aria-hidden />
          <span className="flex size-10 items-center justify-center rounded-[6px] border border-[#171717] bg-[#171717] text-[15px] font-semibold text-white">
            D
          </span>
        </div>
        <h1 className="text-center text-lg font-semibold leading-6 tracking-tight">
          {app.name} wants to access your Deltalytix account
        </h1>
        {email ? (
          <p className="mt-1.5 text-center text-xs leading-4 text-[#686D67]">
            Signed in as {email}
          </p>
        ) : null}
        {switchAccountNext ? (
          <form action={switchAccountAction} className="mt-1 text-center">
            <input type="hidden" name="next" value={switchAccountNext} />
            <button
              type="submit"
              className="text-xs font-medium leading-4 text-[#404040] underline underline-offset-2 hover:text-[#171717]"
            >
              {SWITCH_ACCOUNT_LABEL[locale]}
            </button>
          </form>
        ) : null}
        <div className="mt-5 overflow-hidden rounded-[4px] border border-[#E5E5E5]">
          <p className="px-3 pt-2.5 text-xs font-medium text-[#686D67]">It will be able to</p>
          <ul>
            {scopes.map((scope) => {
              const write = isWriteScope(scope.id)
              return (
                <li
                  key={scope.id}
                  className="flex items-center gap-2.5 border-t border-[#F0F0F0] px-3 py-2.5 text-sm first:border-t-0"
                >
                  <span className="text-[#686D67]">
                    {write ? (
                      <Pencil className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </span>
                  <span>{scopeLabel(scope)}</span>
                  {write ? (
                    <span className="ml-auto rounded-[4px] border border-[#E5E5E5] px-1.5 text-[11px] leading-4 text-[#404040]">
                      Can change data
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
        <p className="mt-3.5 text-xs leading-4 text-[#686D67]">
          It can’t see your password. You can disconnect it anytime in Settings.
        </p>
        <div className="mt-5 flex gap-2">
          <form action={denyAuthorizationAction} className="flex-1">
            <input type="hidden" name="client_id" value={app.clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            {state ? <input type="hidden" name="state" value={state} /> : null}
            <Button
              type="submit"
              variant="outline"
              className="h-9 w-full rounded-[4px] border-[#E5E5E5] bg-white text-sm font-medium text-[#171717] shadow-none hover:bg-[#FAFAFA]"
            >
              Cancel
            </Button>
          </form>
          <form action={approveAuthorizationAction} className="flex-1">
            <input type="hidden" name="client_id" value={app.clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="scope" value={scopeValue} />
            {state ? <input type="hidden" name="state" value={state} /> : null}
            {codeChallenge ? (
              <input type="hidden" name="code_challenge" value={codeChallenge} />
            ) : null}
            {codeChallengeMethod ? (
              <input
                type="hidden"
                name="code_challenge_method"
                value={codeChallengeMethod}
              />
            ) : null}
            {resource ? <input type="hidden" name="resource" value={resource} /> : null}
            <Button
              type="submit"
              className="h-9 w-full rounded-[4px] bg-[#171717] text-sm font-medium text-white shadow-none hover:bg-[#171717]/90"
            >
              Allow
            </Button>
          </form>
        </div>
        <p className="mt-3.5 text-center text-xs leading-4 text-[#686D67]">
          You’ll be sent back to <span className="font-medium text-[#404040]">{host}</span>
        </p>
      </div>
    </main>
  )
}
