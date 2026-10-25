import { cn } from '@heroui/react'

type Edge = 'top' | 'bottom'
type Layer = 'strong' | 'medium' | 'soft'
type Tone = 'background' | 'surface'

const LAYERS: Layer[] = ['strong', 'medium', 'soft']

const LAYER_HEIGHT: Record<Layer, string> = {
  strong: 'h-[30px]',
  medium: 'h-[54px]',
  soft: 'h-[84px]',
}

const LAYER_BLUR: Record<Layer, string> = {
  strong: 'backdrop-blur-[8px]',
  medium: 'backdrop-blur-[3px]',
  soft: 'backdrop-blur-[1.25px]',
}

const LAYER_MASK: Record<Edge, Record<Layer, string>> = {
  top: {
    strong:
      '[mask-image:linear-gradient(to_bottom,black_0%,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_50%,transparent_100%)]',
    medium:
      '[mask-image:linear-gradient(to_bottom,black_0%,black_42%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_42%,transparent_100%)]',
    soft: '[mask-image:linear-gradient(to_bottom,black_0%,black_30%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_30%,transparent_100%)]',
  },
  bottom: {
    strong:
      '[mask-image:linear-gradient(to_top,black_0%,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_0%,black_50%,transparent_100%)]',
    medium:
      '[mask-image:linear-gradient(to_top,black_0%,black_42%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_0%,black_42%,transparent_100%)]',
    soft: '[mask-image:linear-gradient(to_top,black_0%,black_30%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_0%,black_30%,transparent_100%)]',
  },
}

/* 浏览器不支持 backdrop-filter 时退回一层半透明底色。 */
const FALLBACK: Record<Tone, Record<Edge, string>> = {
  background: {
    top: '[@supports_not_(backdrop-filter:blur(1px))]:bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_90%,transparent)_0%,transparent_100%)]',
    bottom:
      '[@supports_not_(backdrop-filter:blur(1px))]:bg-[linear-gradient(to_top,color-mix(in_oklab,var(--background)_90%,transparent)_0%,transparent_100%)]',
  },
  surface: {
    top: '[@supports_not_(backdrop-filter:blur(1px))]:bg-surface/92',
    bottom: '[@supports_not_(backdrop-filter:blur(1px))]:bg-surface/92',
  },
}

/* 减少透明度时不再叠三层模糊，直接用实色把边缘盖住。 */
const REDUCED: Record<Tone, Record<Edge, string>> = {
  background: {
    top: '[@media(prefers-reduced-transparency:reduce)]:bg-[linear-gradient(to_bottom,var(--background)_0%,color-mix(in_oklab,var(--background)_72%,transparent)_55%,transparent_100%)]',
    bottom:
      '[@media(prefers-reduced-transparency:reduce)]:bg-[linear-gradient(to_top,var(--background)_0%,color-mix(in_oklab,var(--background)_72%,transparent)_55%,transparent_100%)]',
  },
  surface: {
    top: '[@media(prefers-reduced-transparency:reduce)]:bg-surface',
    bottom: '[@media(prefers-reduced-transparency:reduce)]:bg-surface',
  },
}

interface EdgeBlurProps {
  edge: Edge
  /** 兜底底色跟随列表所在的背景，或者抽屉的表面色。 */
  tone?: Tone
  /** 表单顶栏只覆盖到内容起点，比列表整块边缘略矮。 */
  height?: 'default' | 'header'
  /** 抽屉顶部的圆角要和抽屉本身一致。 */
  rounded?: boolean
  className?: string
}

/**
 * 列表和抽屉共用的边缘渐进模糊。
 *
 * 三层不同半径的 backdrop-filter 叠加，不铺任何底色：
 * 靠近边缘模糊最强，往内容方向依次减弱，最后一段完全透明。
 */
export const EdgeBlur = ({
  edge,
  tone = 'background',
  height = 'default',
  rounded = false,
  className,
}: EdgeBlurProps) => (
  <div
    aria-hidden='true'
    className={cn(
      'pointer-events-none absolute inset-x-0',
      edge === 'top' ? 'top-0' : 'bottom-0',
      height === 'header' ? 'h-[84px]' : 'h-24',
      rounded && edge === 'top' && 'rounded-t-[28px]',
      FALLBACK[tone][edge],
      REDUCED[tone][edge],
      className
    )}
  >
    {LAYERS.map((layer) => (
      <div
        key={layer}
        className={cn(
          'absolute inset-x-0 bg-transparent',
          edge === 'top' ? 'top-0' : 'bottom-0',
          LAYER_HEIGHT[layer],
          LAYER_BLUR[layer],
          LAYER_MASK[edge][layer],
          rounded && edge === 'top' && 'rounded-t-[28px]',
          '[@media(prefers-reduced-transparency:reduce)]:hidden'
        )}
      />
    ))}
  </div>
)
