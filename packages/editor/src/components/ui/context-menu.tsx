import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMenuPosition } from '@/hooks/editor/useMenuPosition';

interface ContextMenuContextValue {
  opened: boolean;
  setOpened: (opened: boolean) => void;
  position: { x: number; y: number };
  setPosition: (position: { x: number; y: number }) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

const ContextMenuContext = React.createContext<ContextMenuContextValue | null>(null);

interface ContextMenuProps {
  children?: React.ReactNode;
  onOpenChange?: (opened: boolean) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ children, onOpenChange }) => {
  const [opened, setOpenedRaw] = React.useState(false);
  const setOpened = React.useCallback(
    (v: boolean) => {
      setOpenedRaw(v);
      onOpenChange?.(v);
    },
    [onOpenChange],
  );
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!opened) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      e.stopPropagation();
      e.preventDefault();
      setOpened(false);
    };
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      setOpened(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpened(false);
      }
    };

    const rafId = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleMouseDown, true);
      document.addEventListener('contextmenu', handleContextMenu, true);
      document.addEventListener('keydown', handleKeyDown, true);
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [opened, setOpened]);

  return (
    <ContextMenuContext.Provider value={{ opened, setOpened, position, setPosition, dropdownRef }}>
      {children}
    </ContextMenuContext.Provider>
  );
};
ContextMenu.displayName = 'ContextMenu';

interface ContextMenuTriggerProps {
  children?: React.ReactNode;
  asChild?: boolean;
}

const ContextMenuTrigger: React.FC<ContextMenuTriggerProps> = ({ children, asChild }) => {
  const context = React.useContext(ContextMenuContext);
  if (!context) throw new Error('ContextMenuTrigger must be used within ContextMenu');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    context.setPosition({ x: e.clientX, y: e.clientY });
    context.setOpened(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onContextMenu?: React.MouseEventHandler }>, {
      onContextMenu: handleContextMenu,
    });
  }
  return <div onContextMenu={handleContextMenu}>{children}</div>;
};
ContextMenuTrigger.displayName = 'ContextMenuTrigger';

const passthrough: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;
const ContextMenuGroup = passthrough;
const ContextMenuPortal = passthrough;
const ContextMenuSub = passthrough;
const ContextMenuRadioGroup: React.FC<{ children?: React.ReactNode; value?: string; onValueChange?: (value: string) => void }> = ({ children }) => <>{children}</>;

interface ContextMenuSubTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}
const ContextMenuSubTrigger = React.forwardRef<HTMLButtonElement, ContextMenuSubTriggerProps>(
  ({ className, inset, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700 w-full',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </button>
  ),
);
ContextMenuSubTrigger.displayName = 'ContextMenuSubTrigger';

const ContextMenuSubContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white dark:bg-gray-800 p-1 shadow-md', className)}
      {...props}
    />
  ),
);
ContextMenuSubContent.displayName = 'ContextMenuSubContent';

const ContextMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(ContextMenuContext);
    const { menuTop, menuLeft } = useMenuPosition({
      position: context?.opened ? context.position : null,
      menuHeight: 300,
      menuWidth: 200,
    });

    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (context?.dropdownRef) {
          (context.dropdownRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref, context?.dropdownRef],
    );

    if (!context?.opened || typeof document === 'undefined') return null;

    return createPortal(
      <div
        ref={mergedRef}
        className={cn(
          'fixed z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 text-gray-900 dark:text-gray-100 shadow-lg',
          className,
        )}
        style={{ top: menuTop ?? context.position.y, left: menuLeft ?? context.position.x }}
        {...props}
      >
        {children}
      </div>,
      document.body,
    );
  },
);
ContextMenuContent.displayName = 'ContextMenuContent';

interface ContextMenuItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
  disabled?: boolean;
}
const ContextMenuItem = React.forwardRef<HTMLButtonElement, ContextMenuItemProps>(
  ({ className, inset, disabled, children, onClick, ...props }, ref) => {
    const context = React.useContext(ContextMenuContext);
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e);
          context?.setOpened(false);
        }}
        className={cn(
          'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700 disabled:pointer-events-none disabled:opacity-50',
          inset && 'pl-8',
          className,
        )}
        {...props}
      >
        <span className="flex items-center w-full">{children}</span>
      </button>
    );
  },
);
ContextMenuItem.displayName = 'ContextMenuItem';

interface ContextMenuCheckboxItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}
const ContextMenuCheckboxItem = React.forwardRef<HTMLButtonElement, ContextMenuCheckboxItemProps>(
  ({ className, children, checked, onCheckedChange, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700',
        className,
      )}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4" />}
      </span>
      {children}
    </button>
  ),
);
ContextMenuCheckboxItem.displayName = 'ContextMenuCheckboxItem';

interface ContextMenuRadioItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  value?: string;
  disabled?: boolean;
}
const ContextMenuRadioItem = React.forwardRef<HTMLButtonElement, ContextMenuRadioItemProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Circle className="h-2 w-2 fill-current" />
      </span>
      {children}
    </button>
  ),
);
ContextMenuRadioItem.displayName = 'ContextMenuRadioItem';

interface ContextMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}
const ContextMenuLabel = React.forwardRef<HTMLDivElement, ContextMenuLabelProps>(
  ({ className, inset, ...props }, ref) => (
    <div ref={ref} className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)} {...props} />
  ),
);
ContextMenuLabel.displayName = 'ContextMenuLabel';

const ContextMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700', className)} {...props} />
  ),
);
ContextMenuSeparator.displayName = 'ContextMenuSeparator';

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('ml-auto text-xs tracking-widest text-gray-400', className)} {...props} />
);
ContextMenuShortcut.displayName = 'ContextMenuShortcut';

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuRadioGroup,
};
