import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs subcomponents must be used within <Tabs>');
  return ctx;
}

interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
    const [internal, setInternal] = React.useState(defaultValue ?? '');
    const isControlled = value !== undefined;
    const current = isControlled ? (value as string) : internal;

    const setValue = React.useCallback(
      (next: string) => {
        if (!isControlled) setInternal(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange],
    );

    return (
      <TabsContext.Provider value={{ value: current, setValue }}>
        <div ref={ref} className={cn('', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-800 p-1 text-gray-500 dark:text-gray-400',
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { value: active, setValue } = useTabs();
    const isActive = active === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        data-active={isActive ? '' : undefined}
        onClick={() => setValue(value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-white data-[active]:text-gray-950 data-[active]:shadow-sm dark:ring-offset-zinc-900 dark:focus-visible:ring-gray-300 dark:data-[active]:bg-zinc-900 dark:data-[active]:text-gray-50',
          className,
        )}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: active } = useTabs();
    if (active !== value) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn('mt-2 focus-visible:outline-none', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
