import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { UserAuthForm } from "../components/user-auth-form"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Deltalytix - Authentication",
  description: "Authenticate with email or discord",
}



export default function AuthenticationPage() {
  return (
    <div>
          
      <div className="flex relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 bg-foreground">

          </div>
          {/* <Image
            src="/auth-illustration-dark.png"
            width={1280}
            height={843}
            alt="Authentication"
            className="max-w-3xl absolute top-1/2 -translate-y-1/2  block dark:hidden mx-auto"
          />
          <Image
            src="/auth-illustration-light.png"
            width={1280}
            height={843}
            alt="Authentication"
          /> */}

          <div className="relative z-20 flex items-center text-lg font-medium">

            <Link href="/" className="flex items-center gap-2">
              <Logo className="w-10 h-10 fill-white"/>
              Deltalytix
            </Link>
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Deltalytix helped me understand my trading behaviours, and find new strategies I could earn from.&rdquo;
              </p>
              <footer className="text-sm">Hugo DEMENEZ</footer>
            </blockquote>
          </div>
        </div>
        <div className="p-4 lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Authentication
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email, we will send a magic link to your inbox and create a new account if you don&apos;t have one.
              </p>
            </div>
            <UserAuthForm />
            <p className="px-8 text-center text-sm text-muted-foreground">
              By clicking continue, you agree to our{" "}
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}