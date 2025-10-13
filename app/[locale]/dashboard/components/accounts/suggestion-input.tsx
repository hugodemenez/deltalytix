"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface EnhancedInputProps {
  label?: string
  placeholder?: string
  suggestions: string[]
  initialValue?: string
  validate?: (value: string) => { valid: boolean; message?: string }
  onChange?: (value: string) => void
  className?: string
}

export default function EnhancedInput({
  label,
  placeholder = "Select or enter a value",
  suggestions = [],
  initialValue = "",
  validate,
  onChange,
  className,
}: EnhancedInputProps) {
  const [value, setValue] = useState(initialValue)
  const [filteredSuggestions, setFilteredSuggestions] = useState(suggestions)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [validationMessage, setValidationMessage] = useState<string>("")
  const [confirmed, setConfirmed] = useState(false)
  const [skipNextBlur, setSkipNextBlur] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track if component is mounted to avoid state updates after unmount
  const isMounted = useRef(true)
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Handle click outside to hide suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !skipNextBlur
      ) {
        setShowSuggestions(false)
        validateInput(value)
        if (value) {
          setConfirmed(true)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [value, skipNextBlur])

  // Filter suggestions based on input
  useEffect(() => {
    const filtered = suggestions.filter((suggestion) => suggestion.toLowerCase().includes(value.toLowerCase()))
    setFilteredSuggestions(filtered)
  }, [value, suggestions])

  // Reset selectedIndex when filtered suggestions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [filteredSuggestions])

  // Handle confirmation animation
  useEffect(() => {
    if (confirmed) {
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setConfirmed(false)
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [confirmed])

  // Pre-validate initial value if provided
  useEffect(() => {
    if (initialValue && validate && !hasInteracted) {
      const result = validate(initialValue)
      setIsValid(result.valid)
      setValidationMessage(result.message || "")
    }
  }, [initialValue, validate, hasInteracted])

  const validateInput = (inputValue: string) => {
    if (!validate) {
      setIsValid(true)
      return true
    }

    const result = validate(inputValue)
    setIsValid(result.valid)
    setValidationMessage(result.message || "")
    return result.valid
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    if (onChange) onChange(newValue)
    setIsValid(null)
    setHasInteracted(true)
  }

  const handleInputFocus = () => {
    setShowSuggestions(true)
    setHasInteracted(true)
  }

  const handleInputBlur = () => {
    // If we're handling a suggestion click, skip this blur validation
    if (skipNextBlur) {
      setSkipNextBlur(false)
      return
    }

    // Small delay to allow clicking on suggestions
    setTimeout(() => {
      if (document.activeElement !== inputRef.current && isMounted.current) {
        setShowSuggestions(false)
        validateInput(value)
        if (value) {
          setConfirmed(true)
        }
      }
    }, 150)
  }

  const confirmSelection = (selectedValue: string) => {
    // Mark as interacted
    setHasInteracted(true)

    // Set flag to skip the next blur validation
    setSkipNextBlur(true)

    // Update the value first
    setValue(selectedValue)
    if (onChange) onChange(selectedValue)

    // Hide suggestions
    setShowSuggestions(false)

    // Validate with the selected value directly
    if (validate) {
      const result = validate(selectedValue)
      setIsValid(result.valid)
      setValidationMessage(result.message || "")
    } else {
      setIsValid(true)
    }

    // Trigger confirmation animation only if there's a value
    if (selectedValue) {
      setConfirmed(true)
    }

    // Blur the input to complete the selection
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    confirmSelection(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setHasInteracted(true)

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
        confirmSelection(filteredSuggestions[selectedIndex])
      } else {
        // For Enter without selection, validate and blur
        validateInput(value)
        if (value) {
          setConfirmed(true)
        }
        setShowSuggestions(false)
        inputRef.current?.blur()
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const clearInput = (e: React.MouseEvent) => {
    e.stopPropagation()
    setValue("")
    setIsValid(null)
    setSelectedIndex(-1)
    setShowSuggestions(true)
    setHasInteracted(true)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-xs", className)}>
      {label && <label className="mb-2 block text-sm font-medium text-foreground/80">{label}</label>}
      <div
        className={cn(
          "relative flex items-center rounded-md border transition-all",
          "border-input bg-background",
          confirmed && value ? "scale-[1.02] duration-300" : "",
          isValid === false ? "border-destructive" : "",
          isValid === true ? "border-green-500" : "",
        )}
      >
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-invalid={isValid === false}
          aria-describedby={isValid === false ? "validation-message" : undefined}
          className={cn(
            "w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm outline-hidden ring-0 focus:ring-0 pr-14",
            "text-foreground",
            "placeholder:text-muted-foreground",
            isValid === false ? "text-destructive" : "",
            isValid === true ? "text-green-500" : "",
          )}
        />
        <div className="absolute right-0 flex items-center pr-2">
          {value && (
            <button
              type="button"
              onClick={clearInput}
              className="mr-1 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Clear input"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showSuggestions ? "rotate-180" : ""
            )}
          />
        </div>
      </div>

      {isValid === false && validationMessage && (
        <p id="validation-message" className="mt-1 text-xs text-destructive">
          {validationMessage}
        </p>
      )}

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          ref={suggestionsRef}
          className={cn(
            "absolute z-10 mt-1 w-full overflow-auto rounded-md border py-1 text-sm shadow-lg max-h-[200px]",
            "border-input bg-background",
            "text-foreground"
          )}
          role="listbox"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={selectedIndex === index}
              className={cn(
                "cursor-pointer px-3 py-2",
                "hover:bg-accent hover:text-accent-foreground",
                selectedIndex === index ? "bg-accent text-accent-foreground" : ""
              )}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
