'use client'

import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'

export function Toast() {
  const { theme } = useTheme()
  
  return (
    <Toaster
      theme={theme as 'light' | 'dark' | 'system'}
      position="bottom-right"
      richColors
      closeButton
      expand={false}
      duration={4000}
      toastOptions={{
        classNames: {
          toast: 'group',
          title: 'font-semibold',
          description: 'text-sm opacity-90',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
    />
  )
}

export { toast } from 'sonner'
