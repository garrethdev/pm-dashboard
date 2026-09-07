import {
  ArrowDown as PhArrowDown,
  ArrowDownRight as PhArrowDownRight,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUp as PhArrowUp,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise as PhArrowsClockwise,
  ArrowsDownUp as PhArrowsDownUp,
  Bell as PhBell,
  CalendarBlank as PhCalendarBlank,
  CalendarDot as PhCalendarDot,
  CalendarDots as PhCalendarDots,
  Cards as PhCards,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  ChartBar as PhChartBar,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  CircleNotch as PhCircleNotch,
  CloudSlash as PhCloudSlash,
  DeviceMobile as PhDeviceMobile,
  FileMagnifyingGlass as PhFileMagnifyingGlass,
  FilmSlate as PhFilmSlate,
  FlowArrow as PhFlowArrow,
  Gear as PhGear,
  Globe as PhGlobe,
  House as PhHouse,
  Images as PhImages,
  ListChecks as PhListChecks,
  MagnifyingGlass as PhMagnifyingGlass,
  Minus as PhMinus,
  Moon as PhMoon,
  Package as PhPackage,
  PauseCircle as PhPauseCircle,
  Play as PhPlay,
  PlayCircle as PhPlayCircle,
  Plus as PhPlus,
  ShieldWarning as PhShieldWarning,
  Sidebar as PhSidebar,
  SidebarSimple as PhSidebarSimple,
  SignOut as PhSignOut,
  Sliders as PhSliders,
  SlidersHorizontal as PhSlidersHorizontal,
  Sparkle as PhSparkle,
  SquaresFour as PhSquaresFour,
  Stethoscope as PhStethoscope,
  Sun as PhSun,
  UserCheck as PhUserCheck,
  UserPlus as PhUserPlus,
  Users as PhUsers,
  Wallet as PhWallet,
  Warning as PhWarning,
  X as PhX,
} from "@phosphor-icons/react/ssr";
import type { Icon as PhIcon, IconWeight } from "@phosphor-icons/react/lib";

/**
 * The app's icon vocabulary — one adapter over Phosphor, rendered at `fill`
 * weight.
 *
 * Everything imports from here rather than from the icon package directly, so
 * swapping the set or the weight is a change to this file and nothing else.
 * The names are the ones the codebase already used, which is why the migration
 * touched import lines only and never markup.
 *
 * Imports come from the `/ssr` entry: it is context-free and therefore safe in
 * both Server and Client Components, where the main entry reads its weight from
 * React context that a Server Component cannot provide.
 */
export interface IconProps {
  className?: string;
  size?: number | string;
}

function icon(Base: PhIcon, name: string, weight: IconWeight = "fill") {
  const Wrapped = (props: IconProps) => <Base {...props} weight={weight} />;
  Wrapped.displayName = name;
  return Wrapped;
}

export const AlertTriangle = icon(PhWarning, "AlertTriangle");
export const ArrowDown = icon(PhArrowDown, "ArrowDown");
export const ArrowDownRight = icon(PhArrowDownRight, "ArrowDownRight");
export const ArrowLeft = icon(PhArrowLeft, "ArrowLeft");
export const ArrowRight = icon(PhArrowRight, "ArrowRight");
export const ArrowUp = icon(PhArrowUp, "ArrowUp");
export const ArrowUpDown = icon(PhArrowsDownUp, "ArrowUpDown");
export const ArrowUpRight = icon(PhArrowUpRight, "ArrowUpRight");
export const BarChart3 = icon(PhChartBar, "BarChart3");
export const Bell = icon(PhBell, "Bell");
export const CalendarClock = icon(PhCalendarDot, "CalendarClock");
export const CalendarDays = icon(PhCalendarDots, "CalendarDays");
export const CalendarRange = icon(PhCalendarBlank, "CalendarRange");
export const Check = icon(PhCheck, "Check");
export const CheckCircle2 = icon(PhCheckCircle, "CheckCircle2");
export const ChevronDown = icon(PhCaretDown, "ChevronDown");
export const ChevronLeft = icon(PhCaretLeft, "ChevronLeft");
export const ChevronRight = icon(PhCaretRight, "ChevronRight");
export const CloudOff = icon(PhCloudSlash, "CloudOff");
export const ExternalLink = icon(PhArrowSquareOut, "ExternalLink");
export const FileSearch = icon(PhFileMagnifyingGlass, "FileSearch");
export const Film = icon(PhFilmSlate, "Film");
export const Globe = icon(PhGlobe, "Globe");
export const Images = icon(PhImages, "Images");
export const LayoutDashboard = icon(PhSquaresFour, "LayoutDashboard");
export const LayoutList = icon(PhCards, "LayoutList");
export const ListChecks = icon(PhListChecks, "ListChecks");
export const Loader2 = icon(PhCircleNotch, "Loader2", "bold");
export const LogOut = icon(PhSignOut, "LogOut");
export const Minus = icon(PhMinus, "Minus");
export const Moon = icon(PhMoon, "Moon");
export const Package = icon(PhPackage, "Package");
export const PanelLeft = icon(PhSidebar, "PanelLeft");
export const PanelLeftClose = icon(PhSidebarSimple, "PanelLeftClose");
export const PauseCircle = icon(PhPauseCircle, "PauseCircle");
export const Play = icon(PhPlay, "Play");
export const PlayCircle = icon(PhPlayCircle, "PlayCircle");
export const Plus = icon(PhPlus, "Plus");
export const RotateCw = icon(PhArrowsClockwise, "RotateCw");
export const Search = icon(PhMagnifyingGlass, "Search");
export const Settings = icon(PhGear, "Settings");
export const ShieldAlert = icon(PhShieldWarning, "ShieldAlert");
export const Sliders = icon(PhSliders, "Sliders");
export const SlidersHorizontal = icon(PhSlidersHorizontal, "SlidersHorizontal");
export const Smartphone = icon(PhDeviceMobile, "Smartphone");
export const Sparkles = icon(PhSparkle, "Sparkles");
export const Stethoscope = icon(PhStethoscope, "Stethoscope");
export const Sun = icon(PhSun, "Sun");
export const TriangleAlert = icon(PhWarning, "TriangleAlert");
export const UserCheck = icon(PhUserCheck, "UserCheck");
export const UserPlus = icon(PhUserPlus, "UserPlus");
export const Users = icon(PhUsers, "Users");
export const Wallet = icon(PhWallet, "Wallet");
export const Workflow = icon(PhFlowArrow, "Workflow");
export const X = icon(PhX, "X");
export const House = icon(PhHouse, "House");
export const CalendarDots = icon(PhCalendarDots, "CalendarDots");
export const Cards = icon(PhCards, "Cards");
export const FlowArrow = icon(PhFlowArrow, "FlowArrow");
export const ChartBar = icon(PhChartBar, "ChartBar");
export const Sparkle = icon(PhSparkle, "Sparkle");
export const Gear = icon(PhGear, "Gear");
export const SignOut = icon(PhSignOut, "SignOut");
