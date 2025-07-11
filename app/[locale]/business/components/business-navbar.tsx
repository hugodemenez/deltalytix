'use client'

import React, { useState, useEffect } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Logo } from "@/components/logo"
import { Moon, Sun, Menu, Globe, Laptop } from "lucide-react"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useTheme } from '@/context/theme-provider'
import { cn } from '@/lib/utils'
import { useChangeLocale, useI18n } from "@/locales/client"
import { useRouter, usePathname } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useCurrentLocale } from '@/locales/client'
import { LanguageSelector } from "@/components/ui/language-selector"
import { Badge } from "@/components/ui/badge"

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

const MobileNavItem = ({ href, children, onClick, className }: { href: string; children: React.ReactNode; onClick?: () => void, className?: string }) => (
    <li>
        <Link href={href} className={cn("block py-2 hover:text-primary transition-colors", className)} onClick={onClick}>
            {children}
        </Link>
    </li>
)

export default function BusinessNavbar() {
    const { theme, setTheme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)
    const [isVisible, setIsVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)
    const t = useI18n()
    const router = useRouter()
    const pathname = usePathname()
    const currentLocale = useCurrentLocale()

    const toggleMenu = () => setIsOpen(!isOpen)
    const closeMenu = () => setIsOpen(false)

    useEffect(() => {
        const controlNavbar = () => {
            if (typeof window !== 'undefined') {
                const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
                
                if (scrollPercent <= 25) {
                    setIsVisible(true)
                } else if (window.scrollY > lastScrollY) {
                    setIsVisible(false)
                } else {
                    setIsVisible(true)
                }

                setLastScrollY(window.scrollY)
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', controlNavbar)

            return () => {
                window.removeEventListener('scroll', controlNavbar)
            }
        }
    }, [lastScrollY])

    const [themeOpen, setThemeOpen] = useState(false)
    const [languageOpen, setLanguageOpen] = useState(false)
    const changeLocale = useChangeLocale()
    const handleThemeChange = (value: string) => {
        setTheme(value as "light" | "dark" | "system")
        setThemeOpen(false)
    }

    const handleLanguageChange = (value: string) => {
        changeLocale(value as "en" | "fr")
        setLanguageOpen(false)
    }

    const getThemeIcon = () => {
        if (theme === 'light') return <Sun className="h-5 w-5" />;
        if (theme === 'dark') return <Moon className="h-5 w-5" />;
        // For 'system' theme, we need to check the actual applied theme
        if (typeof window !== 'undefined') {
            const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
        }
        // Fallback to Laptop icon if we can't determine
        return <Laptop className="h-5 w-5" />;
    };

    const MobileNavContent = ({ onLinkClick }: { onLinkClick: () => void }) => (
        <nav className="flex flex-col space-y-4">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="features">
                    <AccordionTrigger>Features</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 list-none">
                            <MobileNavItem href="/business#features" onClick={onLinkClick}>Multi-Account Management</MobileNavItem>
                            <MobileNavItem href="/business#features" onClick={onLinkClick}>Team Analytics</MobileNavItem>
                            <MobileNavItem href="/business#features" onClick={onLinkClick}>Real-Time Monitoring</MobileNavItem>
                            <MobileNavItem href="/business#features" onClick={onLinkClick}>Risk Management</MobileNavItem>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="roadmap">
                    <AccordionTrigger>Roadmap</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 list-none">
                            <MobileNavItem href="/business#roadmap" onClick={onLinkClick}>Q1 2024 - Core Features</MobileNavItem>
                            <MobileNavItem href="/business#roadmap" onClick={onLinkClick}>Q2 2024 - Advanced Analytics</MobileNavItem>
                            <MobileNavItem href="/business#roadmap" onClick={onLinkClick}>Q3 2024 - Enterprise API</MobileNavItem>
                            <MobileNavItem href="/business#roadmap" onClick={onLinkClick}>Q4 2024 - Full Launch</MobileNavItem>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <ul className='list-none'>
                    <MobileNavItem href="/business#pricing" onClick={onLinkClick} className={cn(
                        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 border-b",
                    )}>Pricing</MobileNavItem>
                </ul>
            </Accordion>
            <Button asChild variant="outline" className="w-full" onClick={onLinkClick}>
                <Link href={"/dashboard"}>{t('business.cta')}</Link>
            </Button>
            <div className="py-4 border-t space-y-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">
                            {getThemeIcon()}
                            <span className="ml-2">Change theme</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandList>
                                <CommandGroup>
                                    <CommandItem onSelect={() => handleThemeChange("light")}>
                                        <Sun className="mr-2 h-4 w-4" />
                                        <span>Light</span>
                                    </CommandItem>
                                    <CommandItem onSelect={() => handleThemeChange("dark")}>
                                        <Moon className="mr-2 h-4 w-4" />
                                        <span>Dark</span>
                                    </CommandItem>
                                    <CommandItem onSelect={() => handleThemeChange("system")}>
                                        <Laptop className="mr-2 h-4 w-4" />
                                        <span>System</span>
                                    </CommandItem>
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                <LanguageSelector showLabel align="start" />
            </div>
        </nav>
    )

    return (
        <>
            <div className={`fixed inset-0 bg-background/80  backdrop-blur-sm z-40 transition-opacity duration-300 ${hoveredItem ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
            <span className={`h-14 fixed top-0 left-0 right-0 bg-background z-50 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}></span>
            <header className={`max-w-7xl mx-auto fixed top-0 left-0 right-0 px-4 lg:px-6 h-14 flex items-center justify-between z-50  text-foreground transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <Link href="/business" className="flex items-center space-x-2">
                    <Logo className='w-6 h-6 fill-black dark:fill-white' />
                    <span className="font-bold text-xl">Deltalytix</span>
                    <Badge variant="secondary" className="text-xs">
                        {t('business.badge')}
                    </Badge>
                </Link>
                <div className="hidden lg:block">
                    <NavigationMenu>
                        <NavigationMenuList className="list-none">
                            <NavigationMenuItem onMouseEnter={() => setHoveredItem('features')} onMouseLeave={() => setHoveredItem(null)}>
                                <NavigationMenuTrigger className='bg-transparent'>Features</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr] list-none">
                                        <li className="row-span-3">
                                            <NavigationMenuLink asChild>
                                                <Link className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md" href="/business">
                                                    <Logo className='w-6 h-6' />
                                                    <div className="mb-2 mt-4 text-lg font-medium">
                                                        Deltalytix Enterprise
                                                    </div>
                                                    <p className="text-sm leading-tight text-muted-foreground">
                                                        Advanced analytics for trading teams
                                                    </p>
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>
                                        <ListItem href="/business#features" title="Multi-Account Management">
                                            Monitor and analyze performance across multiple trading accounts
                                        </ListItem>
                                        <ListItem href="/business#features" title="Team Analytics">
                                            Track individual trader performance and optimize team allocation
                                        </ListItem>
                                        <ListItem href="/business#features" title="Real-Time Monitoring">
                                            Get instant alerts and real-time updates on trading activities
                                        </ListItem>
                                        <div className='col-span-2'>
                                            <ListItem href="/business#features" title="Risk Management">
                                                Advanced risk analytics with position sizing and drawdown analysis
                                            </ListItem>
                                        </div>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem onMouseEnter={() => setHoveredItem('roadmap')} onMouseLeave={() => setHoveredItem(null)}>
                                <NavigationMenuTrigger className='bg-transparent'>Roadmap</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-3 p-4 w-[400px] list-none">
                                        <ListItem href="/business#roadmap" title="Q1 2024 - Core Features">
                                            Multi-account dashboard, team analytics, basic reporting
                                        </ListItem>
                                        <ListItem href="/business#roadmap" title="Q2 2024 - Advanced Analytics">
                                            Real-time monitoring, risk management tools, compliance reporting
                                        </ListItem>
                                        <ListItem href="/business#roadmap" title="Q3 2024 - Enterprise API">
                                            Enterprise API, custom integrations, advanced security
                                        </ListItem>
                                        <ListItem href="/business#roadmap" title="Q4 2024 - Full Launch">
                                            Complete enterprise suite, dedicated support, custom onboarding
                                        </ListItem>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/business#pricing" legacyBehavior passHref>
                                    <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'bg-transparent')}>
                                        Pricing
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                        <Separator orientation="vertical" className="h-6 mx-4" />
                        <Button variant="ghost" className="text-sm font-medium hover:text-accent-foreground" asChild>
                            <Link href={"/dashboard"}>{t('business.cta')}</Link>
                        </Button>
                    </NavigationMenu>
                </div>

                <div className="flex items-center space-x-4">
                    <LanguageSelector />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="hidden lg:inline-flex h-9 w-9 px-0">
                                {getThemeIcon()}
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="end">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => handleThemeChange("light")}>
                                            <Sun className="mr-2 h-4 w-4" />
                                            <span>Light</span>
                                        </CommandItem>
                                        <CommandItem onSelect={() => handleThemeChange("dark")}>
                                            <Moon className="mr-2 h-4 w-4" />
                                            <span>Dark</span>
                                        </CommandItem>
                                        <CommandItem onSelect={() => handleThemeChange("system")}>
                                            <Laptop className="mr-2 h-4 w-4" />
                                            <span>System</span>
                                        </CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="flex lg:hidden" onClick={toggleMenu}>
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[400px] lg:hidden">
                            <div className="flex flex-col h-full">
                                <div className="flex-grow overflow-y-auto py-6">
                                    <MobileNavContent onLinkClick={closeMenu} />
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
        </>
    )
} 