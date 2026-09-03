'use client'

import React, { useRef, useEffect } from 'react'

interface OtpInputFieldProps {
  length?: number
  value: string
  onChange: (otp: string) => void
  onComplete?: (otp: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

export function OtpInputField({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpInputFieldProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Ensure digits array matches length
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    // Extract only digits
    const cleanDigits = rawVal.replace(/\D/g, '')

    if (!cleanDigits) {
      // Empty / Backspaced
      const newDigits = [...digits]
      newDigits[index] = ''
      const newOtp = newDigits.join('')
      onChange(newOtp)
      return
    }

    if (cleanDigits.length > 1) {
      // Multiple digits pasted into one input
      handlePastedContent(cleanDigits, index)
      return
    }

    // Single digit entered
    const char = cleanDigits.slice(-1)
    const newDigits = [...digits]
    newDigits[index] = char
    const newOtp = newDigits.join('')
    onChange(newOtp)

    // Focus next box if available
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.length === length && !newDigits.includes('')) {
      onComplete?.(newOtp)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous and clear it
        e.preventDefault()
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePastedContent = (pastedData: string, startIndex: number = 0) => {
    const cleanPasted = pastedData.replace(/\D/g, '').slice(0, length)
    if (!cleanPasted) return

    const newDigits = [...digits]
    for (let i = 0; i < cleanPasted.length; i++) {
      const targetIdx = startIndex + i
      if (targetIdx < length) {
        newDigits[targetIdx] = cleanPasted[i]
      }
    }

    const newOtp = newDigits.join('')
    onChange(newOtp)

    // Focus the next empty box or the last box
    const nextIdx = Math.min(startIndex + cleanPasted.length, length - 1)
    inputRefs.current[nextIdx]?.focus()

    if (newOtp.length === length && !newDigits.includes('')) {
      onComplete?.(newOtp)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    handlePastedContent(pasted, index)
  }

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-2.5 w-full max-w-sm mx-auto my-3"
      role="group"
      aria-label="Verification Code"
    >
      {Array.from({ length }).map((_, index) => {
        const isFilled = Boolean(digits[index])
        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={length}
            value={digits[index] || ''}
            onChange={(e) => handleInputChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(e, index)}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            className={`w-11 h-13 sm:w-12 sm:h-14 shrink-0 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all duration-150 outline-none select-none shadow-sm ${
              error
                ? 'border-destructive bg-destructive/10 text-destructive focus:ring-2 focus:ring-destructive/30'
                : isFilled
                ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                : 'border-border/80 bg-background hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/30'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
          />
        )
      })}
    </div>
  )
}
