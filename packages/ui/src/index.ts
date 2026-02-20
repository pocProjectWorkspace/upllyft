// Utility
export { cn } from './lib/utils';

// Primitives
export { Button, type ButtonProps } from './components/Button';
export { Card, type CardProps } from './components/Card';
export { Avatar, type AvatarProps } from './components/Avatar';
export { Badge, type BadgeProps } from './components/Badge';
export { Input, type InputProps } from './components/Input';
export { Label } from './components/label';
export { Textarea, type TextareaProps } from './components/textarea';
export { Separator } from './components/separator';
export { Skeleton } from './components/skeleton';
export { Progress } from './components/progress';
export { Checkbox } from './components/checkbox';
export { Switch } from './components/switch';
export { Slider } from './components/slider';
export { RadioGroup, RadioGroupItem } from './components/radio-group';

// Notification
export { NotificationBell } from './components/NotificationBell';

// Crisis
export { SOSButton, type SOSButtonProps } from './components/SOSButton';

// Composite
export { ProgressRing, type ProgressRingProps } from './components/ProgressRing';
export { StatCard, type StatCardProps } from './components/StatCard';
export { ModuleCard, type ModuleCardProps } from './components/ModuleCard';
export { TherapistCard, type TherapistCardProps } from './components/TherapistCard';
export { WorksheetCard, type WorksheetCardProps } from './components/WorksheetCard';
export { PostCard, type PostCardProps, type PostCardAuthor } from './components/PostCard';

// Dialog
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/dialog';

// Alert Dialog
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './components/alert-dialog';

// Dropdown Menu
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/dropdown-menu';

// Select
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/select';

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs';

// Toast
export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './components/toast';
export { Toaster } from './components/toaster';

// Tooltip
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/tooltip';

// Popover
export { Popover, PopoverTrigger, PopoverContent } from './components/popover';

// Scroll Area
export { ScrollArea, ScrollBar } from './components/scroll-area';

// Sheet
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './components/sheet';

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/table';

// Alert
export { Alert, AlertTitle, AlertDescription } from './components/alert';

// Form (requires react-hook-form peer dependency)
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './components/form';

// Hooks
export { useToast, toast } from './hooks/use-toast';
export { useDebounce } from './hooks/use-debounce';
export { useIntersectionObserver } from './hooks/use-intersection-observer';
export { useCommandPalette } from './hooks/use-command-palette';

// Command Palette
export {
  CommandPalette,
  CommandPaletteProvider,
  useCommandPaletteContext,
  type CommandPaletteItem,
  type CommandPaletteProps,
  type CommandPaletteProviderProps,
} from './components/CommandPalette';

// Mira
export { MiraNudge, type MiraNudgeProps } from './mira-nudge';

// Layouts
export { AppHeader, type AppHeaderProps, type NavItem } from './layouts/AppHeader';
export { Sidebar, type SidebarProps, type SidebarItem } from './layouts/Sidebar';
export { PageContainer, type PageContainerProps } from './layouts/PageContainer';
