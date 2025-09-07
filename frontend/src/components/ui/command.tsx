import * as React from "react"
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface CommandContextProps {
  search: string
  setSearch: (search: string) => void
  value: string
  onValueChange: (value: string) => void
}

const CommandContext = React.createContext<CommandContextProps>({
  search: "",
  setSearch: () => {},
  value: "",
  onValueChange: () => {},
})

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, value: controlledValue, onValueChange, ...props }, ref) => {
    const [search, setSearch] = React.useState("")
    const [internalValue, setInternalValue] = React.useState("")
    
    const value = controlledValue !== undefined ? controlledValue : internalValue
    const handleValueChange = onValueChange || setInternalValue

    return (
      <CommandContext.Provider value={{ search, setSearch, value, onValueChange: handleValueChange }}>
        <div
          ref={ref}
          className={cn(
            "flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-gray-900 border border-gray-200",
            className
          )}
          {...props}
        />
      </CommandContext.Provider>
    )
  }
)
Command.displayName = "Command"

interface CommandDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const CommandDialog = ({ children, open, onOpenChange }: CommandDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-[450px]">
        <Command className="[&_[data-command-group-heading]]:px-2 [&_[data-command-group-heading]]:font-medium [&_[data-command-group-heading]]:text-slate-600">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const { search, setSearch } = React.useContext(CommandContext)

  return (
    <div className="flex items-center border-b border-gray-200 px-3">
      <MagnifyingGlassIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        ref={ref}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={cn(
          "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
})
CommandInput.displayName = "CommandInput"

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))
CommandList.displayName = "CommandList"

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { search } = React.useContext(CommandContext)
  
  if (!search) return null
  
  return (
    <div
      ref={ref}
      className="py-6 text-center text-sm text-slate-600"
      {...props}
    />
  )
})
CommandEmpty.displayName = "CommandEmpty"

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { heading?: string }
>(({ className, heading, children, ...props }, ref) => {
  const { search } = React.useContext(CommandContext)

  // Simple filtering - show group if any child would match
  const childrenArray = React.Children.toArray(children)
  const hasVisibleChildren = childrenArray.some((child) => {
    if (React.isValidElement(child) && (child.props as any).children) {
      const text = typeof (child.props as any).children === 'string' 
        ? (child.props as any).children 
        : (child.props as any).value || ''
      return !search || text.toLowerCase().includes(search.toLowerCase())
    }
    return true
  })

  if (!hasVisibleChildren && search) return null

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden p-1 text-gray-900",
        className
      )}
      {...props}
    >
      {heading && (
        <div
          data-command-group-heading
          className="px-2 py-1.5 text-xs font-medium text-slate-600"
        >
          {heading}
        </div>
      )}
      {children}
    </div>
  )
})
CommandGroup.displayName = "CommandGroup"

const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 h-px bg-gray-200", className)}
    {...props}
  />
))
CommandSeparator.displayName = "CommandSeparator"

const CommandItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    onSelect?: (value: string) => void
    disabled?: boolean
  }
>(({ className, value, onSelect, disabled, children, ...props }, ref) => {
  const { search, onValueChange } = React.useContext(CommandContext)
  
  const text = value || (typeof children === 'string' ? children : '')
  const isVisible = !search || text.toLowerCase().includes(search.toLowerCase())
  
  if (!isVisible && search) return null

  const handleClick = () => {
    if (disabled) return
    if (onSelect && value) {
      onSelect(value)
    }
    onValueChange(value || text)
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  )
})
CommandItem.displayName = "CommandItem"

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-slate-600",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}