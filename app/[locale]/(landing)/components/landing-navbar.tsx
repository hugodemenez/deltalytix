'use client'

import React, { useState, useEffect } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Logo } from "@/components/logo"
import { Moon, Sun, Github, FileText, Cpu, Users, Layers, BarChart3, Calendar, BookOpen, Database, LineChart, Menu, Globe, Laptop } from "lucide-react"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useTheme } from '@/components/context/theme-provider'
import { cn } from '@/lib/utils'
import { useUser } from '@/components/context/user-data'
import { useI18n } from "@/locales/client"
import { useRouter, usePathname } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useChangeLocale, useCurrentLocale } from '@/locales/client'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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

export default function Component() {
    const { user } = useUser()
    const { theme, setTheme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)
    const [isVisible, setIsVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)
    const t = useI18n()
    const router = useRouter()
    const pathname = usePathname()
    const currentLocale = useCurrentLocale()
    const changeLocale = useChangeLocale()

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

    const languages = [
        { value: 'en', label: 'English' },
        { value: 'fr', label: 'Français' },
        // Add more languages here
    ]

    const [open, setOpen] = useState(false)

    const changeLanguage = (locale: string) => {
        changeLocale(locale as "en" | "fr")
        setOpen(false)
    }

    const handleThemeChange = (value: string) => {
        setTheme(value as "light" | "dark" | "system")
    }

    const MobileNavContent = ({ onLinkClick }: { onLinkClick: () => void }) => (
        <nav className="flex flex-col space-y-4">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="features">
                    <AccordionTrigger>{t('navbar.features')}</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 list-none">
                            <MobileNavItem href="/#data-import" onClick={onLinkClick}>{t('navbar.dataImport')}</MobileNavItem>
                            <MobileNavItem href="/#performance-visualization" onClick={onLinkClick}>{t('navbar.performanceVisualization')}</MobileNavItem>
                            <MobileNavItem href="/#daily-performance" onClick={onLinkClick}>{t('navbar.dailyPerformance')}</MobileNavItem>
                            <MobileNavItem href="/#ai-journaling" onClick={onLinkClick}>{t('navbar.aiJournaling')}</MobileNavItem>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="developers">
                    <AccordionTrigger>{t('navbar.developers')}</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 list-none">
                            <MobileNavItem href="https://github.com/hugodemenez/deltalytix" onClick={onLinkClick}>{t('navbar.openSource')}</MobileNavItem>
                            <MobileNavItem href="/docs" onClick={onLinkClick}>{t('navbar.documentation')}</MobileNavItem>
                            <MobileNavItem href={process.env.NEXT_PUBLIC_DISCORD_INVITATION || ''} onClick={onLinkClick}>{t('navbar.joinCommunity')}</MobileNavItem>
                            <MobileNavItem href="/api" onClick={onLinkClick}>{t('navbar.api')}</MobileNavItem>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <ul className='list-none'>
                    <MobileNavItem href="/pricing" onClick={onLinkClick} className={cn(
                        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 border-b",
                    )}>{t('navbar.pricing')}</MobileNavItem>
                    <MobileNavItem href="/updates" onClick={onLinkClick} className={cn(
                        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 border-b",
                    )}>{t('navbar.updates')}</MobileNavItem>
                </ul>
            </Accordion>
            <Button asChild variant="outline" className="w-full" onClick={onLinkClick}>
                <Link href={user ? "/dashboard" : "/authentication"}>{user ? t('navbar.dashboard') : t('navbar.signIn')}</Link>
            </Button>
        </nav>
    )

    return (
        <>
            <div className={`fixed inset-0 bg-background/80  backdrop-blur-sm z-40 transition-opacity duration-300 ${hoveredItem ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
            <span className={`h-14 fixed top-0 left-0 right-0 bg-background z-50 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}></span>
            <header className={`max-w-7xl mx-auto fixed top-0 left-0 right-0 px-4 lg:px-6 h-14 flex items-center justify-between z-50  text-foreground transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <Link href="/" className="flex items-center space-x-2">
                    <Logo className='w-6 h-6 fill-black dark:fill-white' />
                    <span className="font-bold text-xl">Deltalytix</span>
                </Link>
                <div className="hidden lg:block">
                    <NavigationMenu>
                        <NavigationMenuList className="list-none">
                            <NavigationMenuItem onMouseEnter={() => setHoveredItem('features')} onMouseLeave={() => setHoveredItem(null)}>
                                <NavigationMenuTrigger className='bg-transparent'>{t('navbar.features')}</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr] list-none">
                                        <li className="row-span-3">
                                            <NavigationMenuLink asChild>
                                                <Link className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md" href="/">
                                                    <Logo className='w-6 h-6' />
                                                    <div className="mb-2 mt-4 text-lg font-medium">
                                                        Deltalytix
                                                    </div>
                                                    <p className="text-sm leading-tight text-muted-foreground">
                                                        {t('navbar.elevateTrading')}
                                                    </p>
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>
                                        <ListItem href="/#data-import" title={t('navbar.dataImport')} icon={<Database className="h-4 w-4" />}>
                                            {t('navbar.dataImportDescription')}
                                        </ListItem>
                                        <ListItem href="/#performance-visualization" title={t('navbar.performanceVisualization')} icon={<LineChart className="h-4 w-4" />}>
                                            {t('navbar.performanceVisualizationDescription')}
                                        </ListItem>
                                        <ListItem href="/#daily-performance" title={t('navbar.dailyPerformance')} icon={<Calendar className="h-4 w-4" />}>
                                            {t('navbar.dailyPerformanceDescription')}
                                        </ListItem>
                                        <div className='col-span-2'>
                                            <ListItem href="/#ai-journaling" title={t('navbar.aiJournaling')} icon={<BookOpen className="h-4 w-4" />} >
                                                {t('navbar.aiJournalingDescription')}
                                            </ListItem>
                                        </div>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/pricing" legacyBehavior passHref>
                                    <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'bg-transparent')}>
                                        {t('navbar.pricing')}
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/updates" legacyBehavior passHref>
                                    <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'bg-transparent')}>
                                        {t('navbar.updates')}
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                            <NavigationMenuItem onMouseEnter={() => setHoveredItem('developers')} onMouseLeave={() => setHoveredItem(null)}>
                                <NavigationMenuTrigger className='bg-transparent'>{t('navbar.developers')}</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] list-none">
                                        <ListItem href="https://github.com/hugodemenez/deltalytix" title={t('navbar.openSource')} icon={<Github className="h-4 w-4" />}>
                                            {t('navbar.openSourceDescription')}
                                        </ListItem>
                                        <ListItem href="#documentation" title={t('navbar.documentation')} icon={<FileText className="h-4 w-4" />}>
                                            {t('navbar.documentationDescription')}
                                        </ListItem>
                                        <ListItem href="https://discord.gg/a5YVF5Ec2n" title={t('navbar.joinCommunity')} icon={<Users className="h-4 w-4" />}>
                                            {t('navbar.joinCommunityDescription')}
                                        </ListItem>
                                        <li className="row-span-3 md:col-span-2">
                                            <NavigationMenuLink asChild>
                                                <a className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md" href="#api">
                                                    <div className="mb-2 mt-4 text-lg font-medium">
                                                        {t('navbar.oneApi')}
                                                    </div>
                                                    <p className="text-sm leading-tight text-muted-foreground">
                                                        {t('navbar.oneApiDescription')}
                                                    </p>
                                                </a>
                                            </NavigationMenuLink>
                                        </li>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                        <Separator orientation="vertical" className="h-6 mx-4" />
                        <Button variant="ghost" className="text-sm font-medium hover:text-accent-foreground" asChild>
                            <Link href={user ? "/dashboard" : "/authentication"}>{user ? t('navbar.dashboard') : t('navbar.signIn')}</Link>
                        </Button>
                    </NavigationMenu>
                </div>

                <div className="flex items-center space-x-4">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className="hidden lg:flex"
                            >
                                <Globe className="h-5 w-5" />
                                <span className="sr-only">{t('navbar.changeLanguage')}</span>
                                <span className="ml-2">{currentLocale.toUpperCase()}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                            <Command>
                                <CommandInput placeholder="Search language..." />
                                <CommandList>
                                    <CommandEmpty>No language found.</CommandEmpty>
                                    <CommandGroup>
                                        {languages.map((language) => (
                                            <CommandItem
                                                key={language.value}
                                                onSelect={() => changeLanguage(language.value)}
                                                className="cursor-pointer"
                                            >
                                                {language.label}
                                            </CommandItem>
                                        ))}
                                        <CommandItem onSelect={() => {
                                            // Here you can implement the logic to request a new language
                                            console.log("Request new language support")
                                            setOpen(false)
                                        }}>
                                            Request new language
                                        </CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hidden lg:flex">
                                {theme === 'light' ? <Sun className="h-5 w-5" /> : 
                                 theme === 'dark' ? <Moon className="h-5 w-5" /> : 
                                 <Laptop className="h-5 w-5" />}
                                <span className="sr-only">{t('navbar.toggleTheme')}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                                <DropdownMenuRadioItem value="light">
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>{t('navbar.lightMode')}</span>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="dark">
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>{t('navbar.darkMode')}</span>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="system">
                                    <Laptop className="mr-2 h-4 w-4" />
                                    <span>{t('navbar.systemTheme')}</span>
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="flex lg:hidden" onClick={toggleMenu}>
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">{t('navbar.openMenu')}</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[400px] lg:hidden">
                            <div className="flex flex-col h-full">
                                <div className="flex-grow overflow-y-auto py-6">
                                    <MobileNavContent onLinkClick={closeMenu} />
                                </div>
                                <div className="py-4 border-t">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="w-full justify-start">
                                                {theme === 'light' ? <Sun className="h-5 w-5 mr-2" /> : 
                                                 theme === 'dark' ? <Moon className="h-5 w-5 mr-2" /> : 
                                                 <Laptop className="h-5 w-5 mr-2" />}
                                                {t('navbar.changeTheme')}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                                                <DropdownMenuRadioItem value="light">
                                                    <Sun className="mr-2 h-4 w-4" />
                                                    <span>{t('navbar.lightMode')}</span>
                                                </DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="dark">
                                                    <Moon className="mr-2 h-4 w-4" />
                                                    <span>{t('navbar.darkMode')}</span>
                                                </DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="system">
                                                    <Laptop className="mr-2 h-4 w-4" />
                                                    <span>{t('navbar.systemTheme')}</span>
                                                </DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="w-full justify-start">
                                                <Globe className="h-5 w-5 mr-2" />
                                                {t('navbar.changeLanguage')}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                            <Command >
                                                <CommandInput placeholder="Search language..." />
                                                <CommandList>
                                                    <CommandEmpty>No language found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {languages.map((language) => (
                                                            <CommandItem
                                                                key={language.value}
                                                                onSelect={() => {
                                                                    changeLanguage(language.value)
                                                                    closeMenu()
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                {language.label}
                                                            </CommandItem>
                                                        ))}
                                                        <CommandItem onSelect={() => {
                                                            // Implement request new language logic
                                                            console.log("Request new language support")
                                                            closeMenu()
                                                        }}>
                                                            Request new language
                                                        </CommandItem>
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
        </>
    )
}