import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { approveAuthorizationAction, denyAuthorizationAction } from "./actions"

type Props = {
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
  scopeValue: string
}

export function AuthorizeConsent({
  app,
  scopes,
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
  scopeValue,
}: Props) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-50 text-zinc-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg border-zinc-200 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            {app.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.logoUrl}
                alt=""
                className="h-10 w-10 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">
                {app.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <CardTitle className="text-xl tracking-tight">{app.name}</CardTitle>
              <CardDescription>
                wants to access your Deltalytix account
              </CardDescription>
            </div>
          </div>
          {app.description ? (
            <p className="text-sm text-zinc-600">{app.description}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-zinc-800">Requested permissions</p>
            <ul className="mt-2 space-y-2">
              {scopes.map((scope) => (
                <li
                  key={scope.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <p className="text-sm font-medium">{scope.description}</p>
                  <p className="text-xs font-mono text-zinc-500">{scope.id}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-zinc-500">
            You will be redirected to{" "}
            <span className="font-mono break-all">{redirectUri}</span>
          </p>
        </CardContent>
        <CardFooter className="flex gap-3">
          <form action={denyAuthorizationAction} className="flex-1">
            <input type="hidden" name="client_id" value={app.clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            {state ? <input type="hidden" name="state" value={state} /> : null}
            <Button type="submit" variant="outline" className="w-full">
              Deny
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
            <Button type="submit" className="w-full">
              Authorize
            </Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  )
}
