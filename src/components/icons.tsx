// Single icon library for the whole project: Phosphor (RSC-safe build).
// Names on the left are the app's semantic names; every icon inherits currentColor.
import type { ComponentType } from "react";
import type { IconProps, IconWeight } from "@phosphor-icons/react";
import * as P from "@phosphor-icons/react/dist/ssr";

type Props = IconProps & { className?: string };

function make(Icon: ComponentType<IconProps>, weight: IconWeight = "regular") {
  const C = (props: Props) => <Icon weight={weight} aria-hidden {...props} />;
  return C;
}

// UI / navigation
export const Search = make(P.MagnifyingGlass);
export const SearchX = make(P.MagnifyingGlassMinus, "light");
export const ZoomIn = make(P.MagnifyingGlassPlus);
export const User = make(P.User);
export const UserCircle = make(P.UserCircle);
export const UserPlus = make(P.UserPlus);
export const Heart = make(P.Heart);
export const ShoppingBag = make(P.Handbag);
export const Menu = make(P.List);
export const X = make(P.X);
export const ChevronDown = make(P.CaretDown);
export const ChevronLeft = make(P.CaretLeft);
export const ChevronRight = make(P.CaretRight);
export const ArrowLeft = make(P.ArrowLeft);
export const ArrowRight = make(P.ArrowRight);
export const ArrowUpRight = make(P.ArrowUpRight);
export const ExternalLink = make(P.ArrowSquareOut);
export const Minus = make(P.Minus);
export const Plus = make(P.Plus);
export const Check = make(P.Check, "bold");
export const CheckCircle2 = make(P.CheckCircle, "fill");
export const AlertCircle = make(P.WarningCircle, "fill");
export const AlertTriangle = make(P.Warning);
export const Info = make(P.Info, "fill");
export const Loader2 = make(P.CircleNotch, "bold");
export const Pause = make(P.Pause, "fill");
export const Play = make(P.Play, "fill");
export const Eye = make(P.Eye);
export const Copy = make(P.Copy);
export const Pencil = make(P.PencilSimple);
export const Trash2 = make(P.Trash);
export const Upload = make(P.UploadSimple);
export const Wand2 = make(P.MagicWand);
export const SlidersHorizontal = make(P.SlidersHorizontal);
export const Star = make(P.Star, "fill");
export const Tag = make(P.Tag);
export const Lock = make(P.LockSimple);
export const Key = make(P.Key);
export const KeyRound = Key;
export const LogOut = make(P.SignOut);
export const History = make(P.ClockCounterClockwise);
export const MessageSquareWarning = make(P.ChatCircleText);

// commerce / store
export const Truck = make(P.Truck);
export const Package = make(P.Package);
export const Landmark = make(P.Bank);
export const Clock = make(P.Clock);
export const MapPin = make(P.MapPin);
export const Mail = make(P.EnvelopeSimple);
export const ShieldCheck = make(P.ShieldCheck);
export const BadgeCheck = make(P.SealCheck);
export const RefreshCw = make(P.ArrowsClockwise);
export const RotateCcw = make(P.ArrowCounterClockwise);
export const Ruler = make(P.Ruler);
export const Gift = make(P.Gift);
export const Sparkle = make(P.Sparkle);
export const Storefront = make(P.Storefront);
export const Headset = make(P.Headset);

// brand / social (glyph logos of social networks — monochrome)
export const MessageCircle = make(P.WhatsappLogo);
export const Instagram = make(P.InstagramLogo);
export const Music2 = make(P.TiktokLogo);

// admin
export const LayoutDashboard = make(P.SquaresFour);
export const FolderTree = make(P.TreeStructure);
export const Boxes = make(P.Stack);
export const ShoppingCart = make(P.ShoppingCart);
export const Users = make(P.Users);
export const UsersRound = make(P.UsersThree);
export const LifeBuoy = make(P.Lifebuoy);
export const Megaphone = make(P.Megaphone);
export const Ticket = make(P.Ticket);
export const Settings = make(P.GearSix);

// product-type glyphs (used by the photo placeholder and category chips)
export const PRODUCT_GLYPHS: Record<string, ComponentType<IconProps>> = {
  sneaker: P.Sneaker,
  running: P.SneakerMove,
  formal: P.Sneaker,
  sandal: P.SneakerMove,
  slide: P.SneakerMove,
  tshirt: P.TShirt,
  polo: P.TShirt,
  shirt: P.TShirt,
  hoodie: P.Hoodie,
  jacket: P.Hoodie,
  pants: P.Pants,
  shorts: P.Pants,
  backpack: P.Backpack,
  bag: P.Handbag,
  tote: P.ToteSimple,
  wallet: P.Wallet,
  watch: P.Watch,
  sunglasses: P.Sunglasses,
  cap: P.BaseballCap,
  hat: P.BaseballCap,
  belt: P.Belt,
  socks: P.Sock,
  bottle: P.Drop,
  accessory: P.Diamond,
};
