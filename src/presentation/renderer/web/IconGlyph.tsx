"use client";

import {
  Activity,
  ArrowRight,
  Check,
  ClipboardList,
  Eye,
  GraduationCap,
  Heart,
  Layers,
  Lightbulb,
  Link2,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Utensils,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { SlideIconId } from "../../archetypes/layout-types";

const ICONS: Record<SlideIconId, LucideIcon> = {
  search: Search,
  clipboard: ClipboardList,
  layers: Layers,
  eye: Eye,
  zap: Zap,
  activity: Activity,
  link: Link2,
  check: Check,
  sparkles: Sparkles,
  utensils: Utensils,
  heart: Heart,
  graduation: GraduationCap,
  users: Users,
  refresh: RefreshCw,
  shield: Shield,
  lightbulb: Lightbulb,
  arrowRight: ArrowRight,
};

export function IconGlyph({
  icon,
  color,
}: {
  icon: SlideIconId;
  color: string;
}) {
  const Glyph = ICONS[icon];
  return (
    <Glyph
      aria-hidden="true"
      color={color}
      strokeWidth={2.25}
      className="h-full w-full"
    />
  );
}
