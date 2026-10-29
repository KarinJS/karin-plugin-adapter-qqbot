const CellularSignal = () => (
  <span className='flex h-3.25 items-end gap-[1.5px]' aria-hidden='true'>
    {[5.5, 7.5, 9.5, 12.5].map((height, index) => (
      <span key={index} className='w-[3.5px] rounded-xs bg-current' style={{ height }} />
    ))}
  </span>
)

const WifiSignal = () => (
  <svg width='19' height='14' viewBox='-1 -1.7 19 14' fill='none' aria-hidden='true'>
    <path d='M8.5 10.7 6.1 8.2a3.5 3.5 0 0 1 4.8 0l-2.4 2.5Z' fill='currentColor' />
    <path d='M3.7 5.8a7 7 0 0 1 9.6 0' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
    <path d='M1 3a10.8 10.8 0 0 1 15 0' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
  </svg>
)

/**
 * iOS 27 的电池图标没有描边，也没有空槽，只剩一块实心胶囊和右侧触点。
 * 参考 Apple 官网 iPhone 18 Pro / iOS 27 的渲染图。
 */
const BatteryIndicator = () => (
  <span className='flex items-center gap-[1.5px]' aria-hidden='true'>
    <span className='block h-3.5 w-6.75 rounded-lg bg-current' />
    <span className='block h-1.5 w-0.5 rounded-r-xs bg-current' />
  </span>
)

/**
 * 样机顶部的 iOS 27 状态栏。
 *
 * 时间在左、信号 / Wi‑Fi / 电池在右，中间留给灵动岛；
 * 灵动岛本身由屏幕遮罩切出来，这里不绘制任何内容。
 *
 * iOS 27 把灵动岛收窄后，状态栏两侧留白明显变大：
 * 时间约在屏幕宽度 13.5% 处，右侧图标组距右边缘约 9.5%；
 * 两组内容与灵动岛垂直居中对齐。
 */
export const Ios27StatusBar = () => (
  <div className='pointer-events-none absolute inset-x-0 top-0 z-45 h-17 text-(--qq-status) select-none'>
    <div className='flex h-full items-center justify-between pr-10.5 pl-15'>
      <span
        className='tabular-nums translate-y-px text-[17px] leading-none font-semibold tracking-[-0.01em]'
        aria-label='9:41'
      >
        9:41
      </span>

      <span className='flex items-center gap-2.25'>
        <CellularSignal />
        <WifiSignal />
        <BatteryIndicator />
      </span>
    </div>
  </div>
)
