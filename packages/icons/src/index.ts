/**
 * Re-export the curated Lucide icons used across Absolo frontends.
 * Keeping the surface narrow keeps tree-shaken bundles small and
 * gives us a chokepoint to swap implementations later.
 */
export {
  // Navigation / chrome
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Search,
  Filter,
  Settings,
  User,
  Users,
  LogOut,

  // Status / feedback
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Loader2,

  // Resources / domains
  Boxes,
  Box,
  Database,
  HardDrive,
  Cloud,
  Globe,
  Globe2,
  Server,
  Network,
  Cpu,
  KeyRound,
  Lock,
  Unlock,
  Eye,
  EyeOff,

  // Actions
  Plus,
  Minus,
  Trash2,
  Pencil,
  Copy,
  Download,
  Upload,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Save,

  // Dev experience
  Terminal,
  Code2,
  GitBranch,
  GitPullRequest,
  GitCommit,
  Github,
  FileText,
  FileCode,

  // Billing
  CreditCard,
  Receipt,
  DollarSign,

  // Theming
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

export { type LucideIcon, type LucideProps } from 'lucide-react';
