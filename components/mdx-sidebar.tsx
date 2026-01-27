"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import { ChevronRight, ChevronDown } from "lucide-react"

type Heading = {
  id: string
  text: string
  level: number
}

function generateId(text: string): string {
  return (
    text
      .toLowerCase()
      // Remove numbers and dots from the start
      .replace(/^[\d.]+\.?\s*/, "")
      // Replace special characters and spaces with hyphens
      .replace(/[^a-z0-9]+/g, "-")
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, "")
  )
}

// Navbar height (h-14 = 56px)
const NAVBAR_HEIGHT = 56
// Mobile section nav height
const MOBILE_NAV_HEIGHT = 52
// Navbar height offset for scroll positioning
const NAVBAR_OFFSET = 100
// Mobile nav height offset (navbar + mobile section nav)
const MOBILE_NAVBAR_OFFSET = NAVBAR_HEIGHT + MOBILE_NAV_HEIGHT + 16

function scrollToElement(element: HTMLElement, isMobile: boolean = false) {
  const offset = isMobile ? MOBILE_NAVBAR_OFFSET : NAVBAR_OFFSET
  const elementPosition = element.getBoundingClientRect().top + window.scrollY
  const offsetPosition = elementPosition - offset

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  })
}

// Progress Ring Component
function ProgressRing({ progress, size = 28, strokeWidth = 2.5 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-white/10"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-blue-500 dark:text-blue-400 transition-all duration-150 ease-out"
      />
    </svg>
  )
}

export function MdxSidebar() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [isHovered, setIsHovered] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activeHeading, setActiveHeading] = useState<string>("")
  const [isNavbarVisible, setIsNavbarVisible] = useState(true)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [hasScrolled, setHasScrolled] = useState(false)
  const pathname = usePathname()
  const manuallyClickedRef = useRef<string>("")
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Extract headings from the rendered content
    const content = document.querySelector("article")
    if (!content) return

    const headingElements = content.querySelectorAll("h1, h2, h3, h4, h5, h6")
    const extractedHeadings: Heading[] = Array.from(headingElements)
      .filter((heading) => heading.tagName === "H2")
      .map((heading) => {
        const text = heading.textContent || ""
        const id = heading.id || generateId(text)

        // Set the ID on the heading element if it doesn't have one
        if (!heading.id) {
          heading.id = id
        }

        return {
          id,
          text,
          level: Number.parseInt(heading.tagName[1]),
        }
      })

    // Use requestAnimationFrame to defer state update
    requestAnimationFrame(() => {
      setHeadings(extractedHeadings)
    })
  }, [pathname])

  useEffect(() => {
    // Track active heading, navbar visibility, and scroll progress
    const handleScroll = () => {
      // Track if user has started scrolling (threshold to account for small movements)
      const scrollThreshold = 10
      setHasScrolled(window.scrollY > scrollThreshold)
      
      // Calculate scroll progress for the article
      const article = document.querySelector("article")
      if (article) {
        const articleRect = article.getBoundingClientRect()
        const articleHeight = article.scrollHeight
        const viewportHeight = window.innerHeight
        // Calculate how much of the article has scrolled past the viewport top
        // When articleRect.top > 0, article hasn't started scrolling into view yet, so scrolled = 0
        // When articleRect.top <= 0, -articleRect.top is how much has scrolled past the top
        const scrolled = Math.max(0, -articleRect.top)
        // Total scrollable distance is article height minus viewport height
        // (we need to scroll this much to see the entire article)
        const totalScrollable = Math.max(1, articleHeight - viewportHeight)
        const progress = Math.min(100, Math.max(0, (scrolled / totalScrollable) * 100))
        setScrollProgress(progress)
      }

      // Check actual navbar visibility by inspecting the header element's className
      const header = document.querySelector("header")
      if (header) {
        // Check if header has -translate-y-full class (navbar is hidden)
        // Check both classList and className string to handle different React rendering scenarios
        const hasTranslateYFull = header.classList.contains('-translate-y-full') || header.className.includes('-translate-y-full')
        const isHidden = hasTranslateYFull
        setIsNavbarVisible(!isHidden)
      }

      // Don't update active heading if user manually clicked recently
      if (manuallyClickedRef.current) return

      const headingElements = headings.map((h) => document.getElementById(h.id)).filter(Boolean)

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i]
        if (element && element.getBoundingClientRect().top <= 100) {
          setActiveHeading(element.id)
          break
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Initial check

    return () => window.removeEventListener("scroll", handleScroll)
  }, [headings])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string, isMobile: boolean = false) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Remove highlight from any previously highlighted elements
      const previouslyHighlighted = document.querySelectorAll(".bg-blue-500\\/20")
      previouslyHighlighted.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.transition = "background-color 0.3s ease-in-out"
          el.classList.remove("bg-blue-500/20")
        }
      })

      // Set manual click state immediately using ref for instant effect
      manuallyClickedRef.current = id

      // Force set the active heading immediately when clicked
      setActiveHeading(id)

      // Close dropdown on mobile
      if (isMobile) {
        setIsDropdownOpen(false)
      }

      // Add temporary highlight styling to new element
      const originalClasses = element.className
      if (element instanceof HTMLElement) {
        element.style.transition = "background-color 0.3s ease-in-out"
        // Small delay to ensure transition is applied before adding the class
        requestAnimationFrame(() => {
          element.classList.add("bg-blue-500/20")
        })
      }

      // Scroll to element with navbar offset
      scrollToElement(element, isMobile)

      // Remove highlight after 1 second and allow scroll tracking again
      timeoutRef.current = setTimeout(() => {
        if (element instanceof HTMLElement) {
          element.style.transition = "background-color 0.3s ease-in-out"
          element.classList.remove("bg-blue-500/20")
          // Wait for transition to complete before restoring original classes
          setTimeout(() => {
            element.className = originalClasses
            manuallyClickedRef.current = "" // Clear manual click state to re-enable scroll tracking
          }, 300) // Match transition duration
        }
      }, 1000)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Get current and next heading for mobile display
  const currentIndex = headings.findIndex((h) => h.id === activeHeading)
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex
  const currentHeading = headings[effectiveIndex]
  const nextHeading = headings[effectiveIndex + 1]

  if (headings.length === 0) return null

  return (
    <>
      {/* Mobile Navigation - Fixed below navbar, moves to top when navbar hides */}
      <div 
        className={`lg:hidden fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/10 transition-all duration-300 ${
          hasScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
        style={{ top: isNavbarVisible ? `${NAVBAR_HEIGHT}px` : '0px' }}
      >
        <div ref={dropdownRef} className="relative px-4 py-2.5">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Progress Ring */}
              <div className="flex-shrink-0">
                <ProgressRing progress={scrollProgress} />
              </div>
              <span className="text-sm font-medium text-foreground truncate">
                {currentHeading?.text || "Sections"}
              </span>
              {nextHeading && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {nextHeading.text}
                  </span>
                </>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          <div
            className={`absolute left-0 right-0 top-full bg-background border-b border-gray-200 dark:border-white/10 shadow-lg transition-all duration-200 ${
              isDropdownOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
          >
            <nav className="max-h-64 overflow-y-auto py-2">
              {headings.map((heading, index) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => handleClick(e, heading.id, true)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    activeHeading === heading.id
                      ? "text-blue-500 dark:text-blue-400 bg-blue-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="text-xs text-muted-foreground w-4 text-right">{index + 1}</span>
                  <span>{heading.text}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block w-64 fixed right-0 top-[10%] h-screen p-6">
        <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          {/* Collapsed State - Bars */}
          <div className={`transition-opacity duration-200 ${isHovered ? "opacity-0" : "opacity-100"}`}>
            <div className="flex flex-col space-y-3 p-2">
              {headings.map((heading) => (
                <div
                  key={heading.id}
                  className={`h-0.5 w-8 rounded-full transition-all duration-200 cursor-pointer ${
                    activeHeading === heading.id
                      ? "bg-black shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:bg-white dark:shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                      : "bg-gray-300 dark:bg-white/10 "
                  }`}
                  onClick={(e) => {
                    e.preventDefault()
                    const element = document.getElementById(heading.id)
                    if (element) {
                      scrollToElement(element)
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Expanded State - Custom Card */}
          <div
            className={`absolute right-0 top-0 transition-all duration-200 ${
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
            }`}
          >
            <div className="w-64 rounded-lg border bg-card text-card-foreground shadow-lg border-gray-200 dark:border-white/10 ">
              <div className="p-4">
                <nav className="space-y-1">
                  {headings.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      onClick={(e) => handleClick(e, heading.id)}
                      className={`block py-1.5 px-2 text-sm rounded transition-colors cursor-pointer text-gray-400 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-white/10 ${
                        activeHeading === heading.id
                          ? "!text-blue-500 dark:!text-blue-400 "
                          : " dark:hover:text-white dark:hover:bg-gray-800"
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
