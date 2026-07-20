import {
  Heart, Users, Brain, Activity, Stethoscope,
  Utensils, Home, ClipboardList, Car, Sparkles,
  HandHelping, Sun, Moon, HeartHandshake,
} from 'lucide-react'
import { createElement, type ComponentType, type SVGProps } from 'react'

export type IconName =
  | 'Heart' | 'Users' | 'Brain' | 'Activity' | 'Stethoscope'
  | 'Utensils' | 'Home' | 'ClipboardList' | 'Car' | 'Sparkles'
  | 'HandHelping' | 'Sun' | 'Moon' | 'HeartHandshake'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const REGISTRY: Record<IconName, IconComponent> = {
  Heart, Users, Brain, Activity, Stethoscope,
  Utensils, Home, ClipboardList, Car, Sparkles,
  HandHelping, Sun, Moon, HeartHandshake,
}

export const ICON_OPTIONS: IconName[] = Object.keys(REGISTRY) as IconName[]

export function CareTypeIcon({
  iconName,
  fallback = 'Sparkles',
  ...props
}: { iconName: string | null; fallback?: IconName } & SVGProps<SVGSVGElement>) {
  const cmp: IconComponent =
    (iconName && (REGISTRY as Record<string, IconComponent>)[iconName]) || REGISTRY[fallback]
  return createElement(cmp, props)
}
