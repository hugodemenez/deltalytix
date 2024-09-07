'use client'

import React from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/logo"
import { Moon, Sun, Github, FileText, Cpu, Users, Layers } from "lucide-react"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useTheme } from './context/theme-provider'

const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a"> & {
        title: string;
        icon?: React.ReactNode;
    }
>(({ className, title, children, icon, ...props }, ref) => {
    return (
        <li>
            <NavigationMenuLink asChild>
                <a
                    ref={ref}
                    className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className}`}
                    {...props}
                >
                    <div className="text-sm font-medium leading-none flex items-center">
                        {icon}
                        <span className="ml-2">{title}</span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                        {children}
                    </p>
                </a>
            </NavigationMenuLink>
        </li>
    )
})
ListItem.displayName = "ListItem"

export default function Navbar() {
    const { theme, toggleTheme } = useTheme()

    return (
        <header className="px-4 lg:px-6 h-14 flex items-center justify-between relative z-50 text-gray-900 dark:text-white transition-colors duration-300">
            <Link href="/" className="flex items-center space-x-2">
                <Logo className='dark:fill-white fill-black w-6 h-6'/>
                <span className="font-bold text-xl">Deltalytix</span>
            </Link>
            <NavigationMenu>
                <NavigationMenuList>
                    <NavigationMenuItem>
                        <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                                <li className="row-span-3">
                                    <NavigationMenuLink asChild>
                                        <a className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md" href="/">
                                            <Logo className='dark:fill-white fill-black w-6 h-6'/>
                                            <div className="mb-2 mt-4 text-lg font-medium">
                                                Deltalytix
                                            </div>
                                            <p className="text-sm leading-tight text-muted-foreground">
                                                Master your trading journey with advanced analytics and insights.
                                            </p>
                                        </a>
                                    </NavigationMenuLink>
                                </li>
                                <ListItem href="#overview" title="Overview">
                                    Get a bird's eye view of your trading performance.
                                </ListItem>
                                <ListItem href="#analytics" title="Analytics">
                                    Deep dive into your trading patterns and metrics.
                                </ListItem>
                                <ListItem href="#portfolio" title="Portfolio Management">
                                    Optimize your investment portfolio with ease.
                                </ListItem>
                            </ul>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <Link href="/pricing" legacyBehavior passHref>
                            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                Pricing
                            </NavigationMenuLink>
                        </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <Link href="/updates" legacyBehavior passHref>
                            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                Updates
                            </NavigationMenuLink>
                        </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavigationMenuTrigger>Developers</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                <ListItem href="https://github.com/hugodemenez/deltalytix" title="Open Source" icon={<Github className="h-4 w-4" />}>
                                    Explore our open-source projects and contribute.
                                </ListItem>
                                <ListItem href="#documentation" title="Documentation" icon={<FileText className="h-4 w-4" />}>
                                    Comprehensive guides and API references.
                                </ListItem>
                                <ListItem href="#engine" title="Engine" icon={<Cpu className="h-4 w-4" />}>
                                    Learn about our powerful trading engine.
                                </ListItem>
                                <ListItem href="https://discord.gg/a5YVF5Ec2n" title="Join the community" icon={<Users className="h-4 w-4" />}>
                                    Connect with other developers and traders.
                                </ListItem>
                                <ListItem href="#integrations" title="Apps & Integrations" icon={<Layers className="h-4 w-4" />}>
                                    Discover apps and integrate with our platform.
                                </ListItem>
                                <li className="row-span-3 md:col-span-2">
                                    <NavigationMenuLink asChild>
                                        <a className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md" href="#api">
                                            <div className="mb-2 mt-4 text-lg font-medium">
                                                One API to rule them all
                                            </div>
                                            <p className="text-sm leading-tight text-muted-foreground">
                                                A single API effortlessly connecting to multiple providers and get one unified format.
                                            </p>
                                        </a>
                                    </NavigationMenuLink>
                                </li>
                            </ul>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                </NavigationMenuList>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" className="text-sm font-medium hover:text-gray-900 dark:hover:text-gray-100" asChild>
                <Link href="/authentication">Sign in</Link>
            </Button>

            </NavigationMenu>

            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </header>
    )
}