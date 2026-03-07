import * as React from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  children: React.ReactNode
}

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean
}

const DropdownMenuContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({ open: false, setOpen: () => {} })

const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, asChild, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownMenuContext)

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        onClick: (e: React.MouseEvent) => {
          setOpen(!open)
          const originalProps = children.props as { onClick?: (e: React.MouseEvent) => void }
          originalProps.onClick?.(e)
        },
      })
    }

    return (
      <button
        ref={ref}
        className={className}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = 'start', sideOffset = 4, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownMenuContext)
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setOpen(false)
        }
      }

      if (open) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [open, setOpen])

    if (!open) return null

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        className={cn(
          'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
          'animate-in fade-in-0 zoom-in-95',
          align === 'start' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'end' && 'right-0',
          className
        )}
        style={{ marginTop: sideOffset }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, inset, children, ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownMenuContext)

    return (
      <button
        ref={ref}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
          'hover:bg-muted focus:bg-muted',
          'disabled:pointer-events-none disabled:opacity-50',
          inset && 'pl-8',
          className
        )}
        onClick={() => setOpen(false)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-sm font-semibold',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
