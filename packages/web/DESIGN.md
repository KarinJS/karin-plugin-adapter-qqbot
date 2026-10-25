# QQBot Web 界面与动效设计说明

这份文档记录 `packages/web` 里已经落地的界面结构、手势规则、动效参数和降级策略。写法尽量接近一份可执行的复刻手册，读完以后应该能在另一个项目里搭出同样的手感，而不只是知道这里用了什么库。

适用范围是 `packages/web/src` 下的全部界面，重点在手机端底部抽屉、横向分页、分段标签、桌面画布翻页、粒子转场和表单反馈。桌面端和手机端是两套独立组件，手机端不复用桌面卡片，这一点决定了后面很多尺寸和交互的选择。

阅读顺序建议先看第 1 到第 3 章，把设计基调和触控优先级建立起来，再看第 4 章的抽屉。抽屉是整套交互的核心，其他动效都围绕它的节奏展开。

---

## 目录

1. 设计基调
2. 动效参数体系
3. 触控优先级与手势判定
4. 手机端底部抽屉
5. 边缘渐进模糊
6. 手机端顶层横向分页
7. 分段标签、拖拽选择与抽屉内左右轻扫
8. 桌面画布与表单翻页
9. 粒子转场
10. 状态、保存与按压反馈
11. 滚动驱动的返回按钮
12. 表单与输入法
13. 可访问性与降级
14. 性能守则
15. 组件与布局规格
16. 复刻清单
17. 验证方法

---

## 1. 设计基调

### 1.1 整体观感

界面接近 iOS 系统应用的观感，内容优先，层级靠留白和细边框建立，颜色几乎全部是黑白灰，动效只负责解释空间关系和状态变化，不负责表演。

具体表现有几个稳定的选择。

- 页面底色和卡片底色只差一点明度，靠 1px 半透明边框分隔，不靠投影堆叠。
- 抽屉、弹窗、卡片一律 `shadow-none`。需要浮起来的地方用边框、模糊和压暗表达。
- 红、绿、黄只出现在状态和危险操作上，而且饱和度压得很低。
- 字号偏小，字重偏中等，标题用负字距收紧，正文行高放松。
- 所有可点击区域至少 44px 高，视觉尺寸可以更小，热区不能更小。
- 手机端的分组照搬 iOS 设置页，小标题在组外，组内用行和分隔线。
- 动效时长集中在 0.12s 到 0.5s，超过 0.5s 的只有粒子消散。

### 1.2 颜色令牌

主题变量写在 `src/styles.css`，全部使用 `oklch`，零彩度。亮色和暗色各一套，HeroUI 的语义变量被整体覆盖。

```css
:root,
[data-theme='light'],
.light {
  --background: oklch(0.976 0 0);
  --foreground: oklch(0.205 0 0);
  --surface: oklch(1 0 0);
  --surface-secondary: oklch(0.962 0 0);
  --surface-tertiary: oklch(0.938 0 0);
  --muted: oklch(0.505 0 0);
  --default: oklch(0.945 0 0);
  --field-background: oklch(0.968 0 0);
  --border: oklch(0.9 0 0);
  --separator: oklch(0.92 0 0);
  --accent: oklch(0.22 0 0);
  --accent-foreground: oklch(0.99 0 0);
  --success: oklch(0.56 0.16 150);
  --warning: oklch(0.62 0.14 70);
  --danger: oklch(0.55 0.2 25);
  --backdrop: rgb(0 0 0 / 0.32);
}

[data-theme='dark'],
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.95 0 0);
  --surface: oklch(0.19 0 0);
  --surface-secondary: oklch(0.225 0 0);
  --surface-tertiary: oklch(0.25 0 0);
  --muted: oklch(0.68 0 0);
  --default: oklch(0.255 0 0);
  --field-background: oklch(0.19 0 0);
  --border: oklch(0.3 0 0);
  --separator: oklch(0.27 0 0);
  --accent: oklch(0.95 0 0);
  --accent-foreground: oklch(0.15 0 0);
  --success: oklch(0.78 0.16 150);
  --warning: oklch(0.82 0.15 80);
  --danger: oklch(0.72 0.19 25);
  --backdrop: rgb(0 0 0 / 0.62);
}
```

零彩度的好处是状态色一出现就有意义。列表里的绿点和黄点不需要额外的图例，用户一眼能分出在线、离线、停用。暗色主题把 `--surface` 提到 0.19，和 0.145 的页面底色拉开一点，卡片边界仍然靠边框，不靠亮度差。

还有两个对比度适配。

```css
@media (prefers-contrast: more) {
  :root, [data-theme='light'], .light {
    --border: oklch(0.55 0 0);
    --muted: oklch(0.35 0 0);
  }
  [data-theme='dark'], .dark {
    --border: oklch(0.7 0 0);
    --muted: oklch(0.82 0 0);
  }
}
```

### 1.3 字体与排版

字体栈直接使用系统字体，避免加载 web font 带来的闪烁。

```css
--font-sans:
  -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI',
  'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
```

常用字号和字距整理成表，复刻时直接照抄。

| 场景 | 字号 | 字重 | 字距 | 行高 |
| --- | --- | --- | --- | --- |
| 登录页大标题 | 3rem | 600 | -0.03em | 1.05 |
| 桌面页面标题 | 1.75rem | 600 | -0.02em | 1.15 |
| 手机页面标题 | 26px | 600 | -0.03em | tight |
| 表单顶栏名字 | 17px | 600 | -0.02em | tight |
| 卡片标题 | 16px | 600 | tight | 默认 |
| 列表主标题 | 15px | 600 | -0.01em | 默认 |
| 正文 | 14px | 400 | 0 | 1.5 到 1.75 |
| 辅助说明 | 11px 到 12px | 400 | 0 | 1.4 到 1.5 |
| 分组小标题 | 13px | 500 | 0 | 默认 |
| eyebrow | 11px | 500 | 0.16em | 默认 |
| 导航文字 | 10px | 400 或 500 | 0 | 1 |

数字统一加 `tabular-nums`，计数、版本号、剩余时间在变化时不会左右抖。

### 1.4 形状、边框与阴影

| 元素 | 圆角 | 边框 | 阴影 |
| --- | --- | --- | --- |
| 底部抽屉 | 顶部 28px | `border-border/60` | 无 |
| 手机分组卡片 | 16px | `border-border/60` | 无 |
| 桌面卡片 | 16px | `border-border/80` | 无 |
| 输入框 | 12px | 由 HeroUI 字段变量控制 | 无 |
| 按钮 | HeroUI 默认 | 无或细边 | 无 |
| 悬浮保存提示 | 全圆角 | `border-border/80` | `shadow-lg` |
| 返回胶囊 | 全圆角 | 随滚动出现 | 随滚动出现 |

抽屉去掉阴影的原因写在 `MobileSheet.tsx` 的类名里。

```tsx
<Drawer.Dialog
  className='flex flex-col overflow-hidden border border-border/60 bg-surface shadow-none will-change-transform'
  style={mobileSheetStyle}
>
```

HeroUI 的 `.drawer__dialog` 自带 `--overlay-shadow: 0 18px 50px rgb(0 0 0 / 0.14)`。这层阴影向上晕开，在抽屉顶部的圆角外侧形成一圈灰黑渐变，停稳时看得很清楚，拖动时反而不明显，因为旧代码在拖动期间临时关掉了阴影。统一去掉以后，抽屉靠 1px 边框和顶部边缘模糊建立边界，圆角附近是干净的。

### 1.5 手机端与桌面端分开

`App.tsx` 用实际宽度分叉，不靠 CSS 断点隐藏。

```tsx
const { isMobile } = useViewport()
if (isMobile) return <MobileShell />
return embedded ? <EmbeddedDesktopShell /> : <DesktopShell />
```

`useViewport` 的判定值有四个。

```ts
isMobile: width < 900
isShort: height < 700
isTiny: width < 380
isLandscape: width > height
```

分开的理由很实际。手机需要底部抽屉、分段标签、iOS 设置页式分组和更紧凑的按钮；桌面需要常驻侧边栏、双列表单、可同时看到列表和详情的画布。两套结构共享数据层和表单逻辑，不共享布局组件。

手机端还有一条硬规则，列表行直接打开底部抽屉，右侧不放箭头。箭头会让用户以为要横向进入详情页，而实际动作是从底部升起一层。

### 1.6 交互原则

下面这些判断贯穿整套界面。复刻时可以先照做，再按产品气质微调。

| 原则 | 具体做法 | 用户得到什么 |
| --- | --- | --- |
| 手势不抢内容 | 输入框、按钮、标签栏从手势里豁免 | 选文字、点按钮不会误触抽屉 |
| 先判断方向再接管 | 死区加 1.2 倍轴向比例 | 斜向滑动不会两个方向来回抢 |
| 跟手阶段不读布局 | 手势开始时量一次，之后只算位移 | 拖动稳定，不会因为重排掉帧 |
| 松手后交给合成器 | 吸附和惯性走 WAAPI | 主线程忙时动画仍然顺 |
| 动画可打断 | 从当前位置继续，不排队不重播 | 快速操作不会被动画拖住 |
| 状态变化有落点 | 圆点脉冲、状态交叉淡化、FLIP | 用户能看出哪里变了 |
| 同一动作只用一种节奏 | 抽屉、画布、表单翻页都是 0.5s power3.out | 连续操作不会换拍 |
| 退场先让出交互 | 退场第一帧关掉 pointer-events | 不用等动画结束就能点背景 |
| 背景跟着手指复原 | 25% 以下压暗和缩放跟手 | 松手前就能预判抽屉要关闭 |
| 降级保留信息 | 减少动态效果时保留透明度和颜色变化 | 无障碍设置下仍然能看懂状态 |
| 层级靠边框和模糊 | 卡片和抽屉不用阴影 | 圆角附近干净，暗色主题不发灰 |
| 内容常驻 | 画布页面、分页页面都不卸载 | 切回来时滚动位置还在 |

这些原则之间会冲突。比如“动画可打断”和“同一动作只用一种节奏”在快速连点时就会打架，解决办法是打断时从当前位置继续，但曲线和时长仍然用同一组。冲突时优先保住跟手和可打断，节奏可以稍后统一。

---

## 2. 动效参数体系

### 2.1 主曲线与主时长

抽屉、桌面画布翻页、卡片高度变化共用一组参数，写在 `src/lib/uiMotion.ts`。

```ts
export const UI_MOTION_DURATION = 0.5
export const UI_MOTION_EASE = 'power3.out'
```

`power3.out` 对应的 CSS 曲线是 `cubic-bezier(0.165, 0.84, 0.44, 1)`，也就是 easeOutQuart 的近似。`styles.css` 里同时定义了它。

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-quart-out: cubic-bezier(0.165, 0.84, 0.44, 1);
}
```

0.5s 用在整块面板的进出场和吸附上。这个时长比常见的 0.25s 慢，但位移距离大，手指刚离开屏幕时动画需要先承接速度，再慢慢收住。曲线前段很快，后段很慢，视觉上不会觉得拖。把同样的 0.5s 配在线性曲线上就会显得迟钝，所以曲线和时长必须成对使用。

其他动效的时长分布如下。

| 交互 | 时长 | 曲线 | 原因 |
| --- | --- | --- | --- |
| 抽屉进出场 | 0.5s | power3.out | 位移大，需要承接离手速度 |
| 抽屉高度吸附 | 0.5s | power3.out | 和进出场同一节奏，连续操作不换拍 |
| 桌面画布翻页 | 0.5s | power3.out | 整页位移，和抽屉一致 |
| 表单换机器人翻页 | 0.5s | power3.out | 和画布翻页同拍 |
| 手机横向分页吸附 | 0.32s | power3.out | 位移只有一页，节奏更快 |
| 抽屉内标签轻扫滑入 | 0.32s | power3.out | 位移只有 24px，不需要 0.5s |
| 详情页进场 | 0.32s | power3.out | 整页从右侧推入 |
| 详情页退场 | 0.24s | power2.in | 退出比进入快，减少等待 |
| 状态交叉淡化 | 0.18s 进入 / 0.16s 退出 | power2.out | 小范围文字变化，不能抢戏 |
| 保存提示首次出现 | 0.28s | back.out(1.35) | 唯一允许轻微回弹的提示 |
| 保存提示消失 | 0.18s | power2.in | 信息已经读完，快速让位 |
| 保存提示内容更新 | 0.16s | power2.out | 同一位置换字，只做轻淡入 |
| 按压反馈 | 0.12s | var(--ease-out) | 必须跟手，不能有延迟感 |
| 列表选中块滑动 | 0.2s | var(--ease-out) | 行间移动，短距离 |
| 顶栏状态横移 | 0.26s | power3.out | 名字变长变短后的位置补偿 |
| 导航图标颜色 | 0.5s | var(--ease-quart-out) | 和页面翻页同一进度 |
| 粒子文字重组 | 0.32s 散开 / 0.34s 收拢 | power2.out / power3.out | 视觉主体是粒子，节奏可以稍长 |
| 未保存标签粒子消散 | 0.42s | power2.out | 元素小，需要更长时间被看清 |
| 卡片删除消散 | 0.62s | power2.in | 退场动作，允许慢一点 |

### 2.2 为什么松手后的动画统一走 WAAPI

抽屉吸附、内容惯性、横向分页吸附、标签滑入、详情页进出场全部使用 `element.animate()`。原因写在 `src/lib/waapi.ts` 的注释里，松手后的 `transform` 和 `opacity` 由合成器驱动，主线程在忙路由提交、React 渲染或 inert 切换时，动画仍然按帧走。

GSAP 只保留在三个地方。

- 粒子转场，需要逐帧画 canvas。
- 表单顶栏的 FLIP，需要在 layout effect 里读取前后位置再补位移。
- `AnimatedHeight` 的高度过渡，高度本来就会触发布局，没有合成器方案。

抽屉早期版本用 GSAP 每帧改 `height`，每帧都要重排整棵抽屉子树，手机上松手后的吸附明显比原生滚动卡。改成固定高度加 `translate3d` 以后，拖动和吸附都只写 `transform`，主线程不再参与逐帧计算。

### 2.3 WAAPI 的曲线采样

WAAPI 的 `easing` 只接受 CSS 曲线，GSAP 的 `power3.out` 不能直接传进去。项目里的做法是把曲线采样成关键帧。

```ts
const STEPS = 60

export const animateProgress = (
  element: Element,
  format: (progress: number) => Keyframe,
  ease: (t: number) => number,
  duration: number,
  onFinish?: () => void,
  steps = STEPS
) => {
  const frames = Array.from({ length: steps + 1 }, (_, index) => format(ease(index / steps)))
  const animation = element.animate(frames, {
    duration: duration * 1000,
    easing: 'linear',
    fill: 'forwards',
  })

  animation.onfinish = () => {
    animation.cancel()
    onFinish?.()
  }

  return animation
}
```

60 个采样点意味着 0.5s 的动画大约每 8ms 一个点，浏览器在点之间线性插值，肉眼和原生曲线没有区别。惯性动画用 120 个点，因为指数衰减的首段速度最快，采样太稀会看出折线。

`fill: 'forwards'` 只在动画期间兜底。结束时先 `cancel()`，再由 `onFinish` 把最终值写回内联样式。顺序不能反，先撤 fill 再写值会有一帧跳回旧位置。

### 2.4 打断的通用写法

所有 WAAPI 动画都遵循同一套读、停、写、再启动的流程。

```ts
const stopTrackAnimation = () => {
  const animation = trackAnimationRef.current
  if (!animation) return

  const x = readTranslate(track, 'x')   // 先读当前值
  animation.cancel()                    // 再取消
  track.style.transform = `translate3d(${x}px, 0, 0)` // 最后写回内联样式
}
```

读取当前 `transform` 用 `DOMMatrixReadOnly`，动画进行中也能拿到实时值。

```ts
export const readTranslate = (element: Element | null | undefined, axis: 'x' | 'y' = 'y') => {
  if (!element) return 0
  const transform = getComputedStyle(element).transform
  if (!transform || transform === 'none') return 0
  const matrix = new DOMMatrixReadOnly(transform)
  return axis === 'x' ? matrix.m41 : matrix.m42
}
```

这套写法支撑了抽屉的三种打断。进场没跑完就关，从当前位置反向滑出；退场没跑完又打开，从当前位置滑回；吸附没结束又被抓住，从当前位置继续拖。用户看不到跳变，也不需要等上一段动画结束。

### 2.5 两帧启动规则

抽屉进场、退场、横向分页吸附都会等两帧再启动动画。

```ts
rafRef.current = requestAnimationFrame(() => {
  rafRef.current = 0
  raf2Ref.current = requestAnimationFrame(() => {
    raf2Ref.current = 0
    const from = readState(dialog, footer, scrim, frame)
    run(dialog, footer, scrim, frame, base, from, target, SHEET_ENTER_DURATION, () => {
      delete dialog.dataset.animating
    })
  })
})
```

打开抽屉时，React 提交、挂载表单、切换背景 inert 会占掉几十到几百毫秒。动画如果立刻开始计时，浏览器真正画出第一帧时动画已经跑到中段，看起来像从半空出现。等两帧让起点落在提交和首次绘制之后。

横向分页也有同样的问题。翻页同时触发路由更新和 inert 切换，主线程被占住，动画第一帧会跳过前段。

### 2.6 减少动态效果

所有动效都检查 `prefers-reduced-motion`，处理方式按组件区分，不做成一刀切。

| 组件 | 减少动态效果时的行为 |
| --- | --- |
| 抽屉进出场 | 直接落到目标位置，不播位移动画 |
| 抽屉吸附 | 直接落到目标高度 |
| 抽屉拖动 | 保留跟手，松手后直接落位 |
| 横向分页 | 直接切页，不播吸附 |
| 详情页 | 直接切换路由 |
| 粒子文字 | 不创建粒子，文字直接替换 |
| 粒子消散 | 不创建粒子，元素直接隐藏 |
| 状态交叉淡化 | 保留 0.12s 透明度变化，去掉位移 |
| 保存提示 | 保留 0.12s 淡入淡出，去掉位移和回弹 |
| 按压反馈 | 去掉缩放，保留颜色变化 |
| 卡片高度 | 直接落位 |
| 滚动平滑 | Lenis 的 `respectReducedMotion` 生效，CSS `scroll-behavior` 改回 auto |

减少动态效果不等于全部静止。透明度变化和颜色变化有助于理解状态，保留。位移、缩放、粒子、回弹去掉。

### 2.7 减少透明度与高对比度

`EdgeBlur` 在 `prefers-reduced-transparency: reduce` 时不再叠三层模糊，直接用实色盖住边缘。

```tsx
const REDUCED: Record<Tone, Record<Edge, string>> = {
  background: {
    top: '[@media(prefers-reduced-transparency:reduce)]:bg-[linear-gradient(to_bottom,var(--background)_0%,color-mix(in_oklab,var(--background)_72%,transparent)_55%,transparent_100%)]',
    bottom: '[@media(prefers-reduced-transparency:reduce)]:bg-[linear-gradient(to_top,var(--background)_0%,color-mix(in_oklab,var(--background)_72%,transparent)_55%,transparent_100%)]',
  },
  surface: {
    top: '[@media(prefers-reduced-transparency:reduce)]:bg-surface',
    bottom: '[@media(prefers-reduced-transparency:reduce)]:bg-surface',
  },
}
```

保存提示和返回胶囊也都有对应的实色降级。透明度偏好和减少动态效果是两件事，分开处理。

---

## 3. 触控优先级与手势判定

这一章是整套交互的地基。抽屉、分页器、分段标签、拖拽选择都在同一套规则上工作，任何一处改错都会让另一处失灵。

### 3.1 触摸走 touch 事件，鼠标和触控笔走 pointer 事件

`MobilePager` 和 `useSheetDrag` 都明确分流。

```ts
const onPointerDown = (event: PointerEvent) => {
  if (event.pointerType === 'touch') return
  if (!event.isPrimary || pointerId !== null) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  ...
}
```

原因在 Chrome 的触摸滚动实现。触摸开始滚动时浏览器会发 `pointercancel`，指针流不可靠，后续 `pointermove` 可能直接断掉。触摸手势因此只监听 `touchstart`、`touchmove`、`touchend`、`touchcancel`。鼠标和触控笔没有这个问题，用 pointer 事件可以获得捕获和更稳定的坐标。

两条路径共享同一套判定函数和动画函数，不共享事件对象。

### 3.2 死区

手指落下后的前几个像素不参与判定，避免轻点和手抖被当成拖动。

| 组件 | 死区 | 说明 |
| --- | --- | --- |
| 抽屉高度拖动 | 6px | `DRAG_START` |
| 横向分页 | 8px | `AXIS_LOCK` |
| 分段标签拖选 | 6px | `AXIS_LOCK` |
| 抽屉内左右轻扫 | 8px | `SWIPE_AXIS_LOCK` |
| 原生滚动接管下拉 | 6px | `DRAG_START` |

死区之内仍然保留跟踪。抽屉在全屏时，手指刚落下时的几像素抖动不能被误判成原生滚动，否则用户想下拉收起，浏览器却先把内容滚了一下。

### 3.3 轴向锁定

横向和纵向同时有位移时，用 1.2 倍的比例判断主方向。

```ts
if (Math.abs(dx) > Math.abs(dy) * 1.2) {
  axis = 'x'
} else if (Math.abs(dy) > Math.abs(dx) * 1.2) {
  axis = 'y'
}
```

取 1.2 倍，不取 1 倍，是为了斜向滑动时留出容错。真正的斜扫很少正好 45 度，1.2 倍能覆盖大多数手指角度，同时避免两个方向来回抢。

锁定以后不再改方向。横向锁定就把后续位移全部交给分页器，纵向锁定就彻底放弃这次指针，交给浏览器或抽屉。

### 3.4 只认第一根手指

所有手势在 `event.touches.length !== 1` 时直接复位。双指缩放、双指滑动、手掌误触都不参与抽屉和分页。

```ts
if (event.touches.length !== 1) {
  cancelPending()
  if (active || scrollActive) finish(false)
  nativeTracking = false
  touchId = null
  return
}
```

已经开始的拖动遇到第二根手指时，用 `finish(false)` 收尾，`allowFlick` 传 `false`，不按离手速度吸附。这样不会因为多指操作把抽屉甩到全屏或退场。

### 3.5 交互元素豁免

抽屉的高度拖动和左右轻扫都要给输入框、按钮、标签栏让路。

```ts
const INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[role="button"]',
  '[role="switch"]',
  '[role="tab"]',
  '[contenteditable="true"]',
  '[data-slot="select-trigger"]',
  '[data-slot="switch"]',
].join(', ')
```

输入框需要选中文字，按钮需要正常点击，标签栏自己有按住拖选。手势从这些元素上开始时直接放弃。

文本输入单独再放行一次。

```ts
if (isTextInput(event.target)) {
  touchId = null
  return
}
```

`textarea` 和 `contenteditable` 里的纵向拖动可能是选文字，不能拿去做抽屉高度。

### 3.6 touch-action 的切换

`touch-action` 决定浏览器是否把手势锁进滚动。抽屉的滚动容器按状态切换。

```ts
const syncTouchAction = () => {
  scroller.style.touchAction = dialog.dataset.sheetExpanded === 'true' ? 'pan-y' : 'none'
}
```

半屏和吸附过程中用 `none`，手势完全归 JS，浏览器不会在抽屉高度变化时把触摸锁进滚动容器。全屏且停稳后改成 `pan-y`，纵向滚动和惯性交给浏览器，横向仍然被阻止。

横向分页器的根节点固定 `touch-pan-y`，纵向永远给浏览器，横向自己处理。分段标签的面板也是 `touch-pan-y`。

按钮和链接统一 `touch-action: manipulation`，去掉移动端 300ms 点击延迟。

```css
button,
a,
[role='button'] {
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
```

### 3.7 点击抑制

拖动结束后不能补发 click。否则用户拖完抽屉，手指下面正好是一个按钮，会误触。

每个手势组件都有 `suppressClickUntil`，在捕获阶段拦掉 click。

```ts
const onClickCapture = (event: MouseEvent) => {
  if (performance.now() < suppressClickUntil) {
    event.preventDefault()
    event.stopPropagation()
    suppressClickUntil = 0
  }
}
```

抽屉、标签拖选和抽屉内轻扫统一 200ms，横向分页用 140ms。拖动开始时就设置一次，长按超过 200ms 时在 `finish` 里按松手时间重新计算。

React Aria 的 Tab 在 `pointerup` 时会触发 press，可能把拖拽选中的标签改回按下的那个。`useDragSelect` 因此在捕获阶段额外拦 `pointerup`。

```ts
const onPointerUpCapture = (event: PointerEvent) => {
  if (!engaged) return
  event.preventDefault()
  event.stopPropagation()
}
```

轻点不受影响，只有已经进入拖拽的手势才拦。

### 3.8 离手速度

轻扫判定不看整段手势的平均速度，看离手瞬间的瞬时速度。实现写在 `src/lib/flick.ts`。

```ts
export const FLICK_MIN_DISTANCE = 24
export const FLICK_VELOCITY_THRESHOLD = 0.45
export const FLICK_VELOCITY_STALE = 100
export const FLICK_MIN_SAMPLE_DT = 4
export const FLICK_SAMPLE_LIMIT = 8

export const getReleaseVelocity = (samples, now = performance.now()) => {
  const last = samples[samples.length - 1]
  if (!last || now - last.t > FLICK_VELOCITY_STALE) return 0

  for (let i = samples.length - 2; i >= 0; i--) {
    const previous = samples[i]
    if (!previous) continue
    const dt = last.t - previous.t
    if (dt >= FLICK_MIN_SAMPLE_DT) return (last.value - previous.value) / dt
  }

  return 0
}
```

参数的含义逐条说明。

| 参数 | 值 | 作用 |
| --- | --- | --- |
| `FLICK_MIN_DISTANCE` | 24px | 速度分支要求的最小位移，防止原地快速点一下也触发翻页 |
| `FLICK_VELOCITY_THRESHOLD` | 0.45 px/ms | 离手速度达到这个值才算轻扫 |
| `FLICK_VELOCITY_STALE` | 100ms | 最后一次移动超过这个时间，认为手指已经停住，速度归零 |
| `FLICK_MIN_SAMPLE_DT` | 4ms | 采样间隔下限，避免高刷屏下除以接近 0 的 dt |
| `FLICK_SAMPLE_LIMIT` | 8 | 只保留最近 8 次采样 |

只保留最近 8 次采样有两个考虑。高刷屏的 `touchmove` 非常密集，全存会浪费内存；离手速度只和最后几十毫秒有关，更早的采样没有意义。

### 3.9 翻页判定

位移达到常规阈值，或者越过防误触距离且速度达标，两者满足一个就翻页。

```ts
export const isFlick = (distance: number, velocity: number) =>
  distance >= FLICK_MIN_DISTANCE && velocity >= FLICK_VELOCITY_THRESHOLD

export const shouldAdvance = (distance: number, velocity: number, distanceThreshold: number) =>
  distance >= distanceThreshold || isFlick(distance, velocity)
```

慢速长滑靠距离翻页，快速短滑靠速度翻页。慢速短滑不翻页，用户可以把页面拖出去一点再放回来。

距离阈值在横向分页里是页宽的 20%，在抽屉内标签轻扫里是 `max(48px, 面板宽 * 0.2)`。

### 3.10 位移归一化

速度的正负号跟着手指方向走，判定前先归一化到目标方向。

```ts
const step = dx < 0 ? 1 : -1
const distance = Math.abs(dx)
const velocity = releaseVelocity * (dx < 0 ? -1 : 1)
const turn = shouldAdvance(distance, velocity, pageWidth * SWIPE_RATIO)
```

左滑 `dx < 0`，目标方向是下一页，速度和距离都取正。右滑相反。这样判定函数不需要知道左右，只需要知道“朝目标方向有多快、多远”。

抽屉的高度拖动也做同样处理。触摸坐标向下为正，向上扫时速度取负。

```ts
const flickUp = isFlick(distance, -releaseVelocity)
const flickDown = isFlick(distance, releaseVelocity)
```

### 3.11 每帧最多写一次

触摸事件频率可能高于屏幕刷新率。所有跟手位移都先存进 `pending`，用 rAF 合并。

```ts
const scheduleDrag = (clientY: number) => {
  pendingY = clientY
  if (frameId) return
  frameId = requestAnimationFrame(applyPending)
}
```

`touchend` 时同步冲刷最后一帧，避免松手位置和画面差一帧。

```ts
const flushDrag = (clientY?: number) => {
  if (frameId) {
    cancelAnimationFrame(frameId)
    frameId = 0
  }
  const next = clientY ?? pendingY
  pendingY = null
  if (next !== null && next !== undefined) applyDrag(next)
}
```

拖动过程中不读布局。可见高度只在手势开始时量一次，后续用起始高度加手指位移算。

```ts
let visibleHeight = 0
let measured = false

const measureVisible = () => {
  if (!measured) {
    measured = true
    const y = readTranslate(dialog)
    lastY = y
    visibleHeight = base() - y
  }
  return visibleHeight
}
```

读一次布局会强制同步重排。在 120Hz 屏幕上每帧读一次，主线程很容易超预算。

### 3.12 指针捕获

鼠标拖动时在越过死区后捕获指针。

```ts
try {
  dialog.setPointerCapture(event.pointerId)
} catch {
  // 某些浏览器不允许在这里捕获，后续 pointermove 仍然可用。
}
```

捕获以后指针移出抽屉甚至移出窗口，`pointermove` 仍然送到抽屉，拖动不会中断。触摸不使用捕获，原因见 3.1。

### 3.13 滚轮与嵌套滚动

桌面端有多层滚动区。滚轮事件按指针位置决定滚哪一层。

```ts
const handleWheel = (event: WheelEvent) => {
  if (event.deltaY === 0) return

  const delta = normalizeWheelDelta(event)
  const target = event.target as HTMLElement | null
  const overCard = Boolean(target?.closest('[data-bot-id]'))
  const canScroll = delta < 0
    ? list.scrollTop > 0
    : list.scrollTop + list.clientHeight < list.scrollHeight - 1

  if (overCard && canScroll) {
    event.preventDefault()
    markHandled(event)
    scrollBy(list, delta)
    return
  }

  const panel = list.closest('[data-bots-workspace]')
    ?.querySelector<HTMLElement>('[data-bots-panel]') ?? null
  const panelCanScroll = panel !== null && (...)

  if (panel && panelCanScroll) {
    event.preventDefault()
    markHandled(event)
    scrollBy(panel, delta)
    return
  }

  const page = findPageScroller()
  if (!page) return
  event.preventDefault()
  markHandled(event)
  scrollBy(page, delta)
}
```

优先级是卡片列表、右侧表单、整页。指针停在卡片上时滚列表，停在列表空白处时滚表单，表单滚到头再滚整页。每一层处理完设置 `lenisStopPropagation`，避免上层的 Lenis 再滚一次。

`normalizeWheelDelta` 处理行模式和页模式。

```ts
const LINE_HEIGHT = 100 / 6

export const normalizeWheelDelta = (event: WheelEvent) => {
  const multiplier = event.deltaMode === 1
    ? LINE_HEIGHT
    : event.deltaMode === 2
      ? window.innerHeight
      : 1
  return event.deltaY * multiplier * smoothScrollOptions.wheelMultiplier
}
```

### 3.14 输入框字号

触摸设备上输入框字号固定 16px。

```css
input,
textarea,
select {
  font-size: 16px;
}

@media (pointer: fine) {
  input,
  textarea,
  select {
    font-size: inherit;
  }
}
```

iOS Safari 在输入框字号小于 16px 时会自动放大页面。放大以后视口变化，抽屉高度和键盘逻辑都会乱。16px 是避免自动缩放的最低值。

### 3.15 手势优先级总结

按优先级从高到低排。

1. 输入框和可编辑区域的文字选择。
2. 按钮、链接、开关、下拉触发器、标签栏的点击。
3. 分段标签的按住拖选。
4. 抽屉内左右轻扫切换标签。
5. 抽屉高度拖动与内容滚动。
6. 顶层横向分页。

同一块区域上可能同时挂着多层监听。`useSheetDrag` 挂在 dialog 上，`MobileSegmentedTabs` 的轻扫也挂在 dialog 上，`useDragSelect` 挂在标签栏上。靠 `INTERACTIVE_SELECTOR`、轴向锁定和事件顺序把冲突拆开。任何新增手势都要先想清楚它排在第几层。

---

## 4. 手机端底部抽屉

抽屉的实现分成四个文件。

| 文件 | 职责 |
| --- | --- |
| `components/mobile/MobileSheet.tsx` | 组装 HeroUI Drawer，测量高度，提供上下文 |
| `hooks/useSheetMotion.ts` | 进出场、退场、背景缩放、动画打断 |
| `hooks/useSheetDrag.ts` | 高度拖动、内容滚动、键盘、吸附 |
| `components/mobile/SheetScaffold.tsx` | 顶栏、底栏、滚动区、边缘模糊的骨架 |
| `lib/sheetMotion.ts` | 所有数值常量 |

### 4.1 高度模型

抽屉的 dialog 高度始终等于打开瞬间测到的可用高度 `base`，不随内容变化，也不随地址栏收缩。收起时整体向下平移。

```ts
const base = Math.max(1, content?.clientHeight || viewport)
baseHeightRef.current = base
dialog.style.height = `${base}px`
dialog.style.maxHeight = `${base}px`
dialog.dataset.sheetRestY = String(base - height)
```

可见高度和位移的关系只有一条公式。

```ts
y = base - visibleHeight
```

底栏和底部模糊层放在同一个容器里，按反向位移跟随。

```ts
const FOOTER_FLOOR = 0.75
const footerYFor = (y: number, base: number) => -Math.min(y, base * FOOTER_FLOOR)
```

`y` 是抽屉向下的位移。底栏的反向位移取 `-y`，但最多只抵消 75% 的 `base`。这样可见高度高于 25% 时，底栏正好停在屏幕底部不动；低于 25% 后，底栏不再继续反向补偿，跟着抽屉一起滑出屏幕。

为什么用固定像素高度，不用 `dvh`。移动端浏览器地址栏展开收起会让 `dvh` 不断变化，抽屉在滚动时忽高忽低。打开瞬间量一次 `clientHeight`，整个打开周期内保持不变。只有输入法弹出这种真正改变可见区域的情况才临时改 `base`，见 4.10。

为什么用 `translate3d`，不改 `height`。`height` 每帧触发布局和重绘，整棵抽屉子树都要重排。`translate3d` 只走合成器。抽屉内容再复杂，拖动成本也不变。

`sheetRestY` 记录真正停稳的位置。快速打开又取消时，退场往往从进场中途开始，重新打开要回到上一次停稳的位置，不能拿中途值当落点，否则每次打断都会把落点往下带一点，抽屉越弹越矮。

### 4.2 状态与阈值

抽屉有三个吸附档位和两个动作阈值。

```ts
export const SHEET_COLLAPSED_RATIO = 0.5
export const SHEET_EXPAND_THRESHOLD = 0.75
export const SHEET_DISMISS_THRESHOLD = 0.25
```

| 比例 | 行为 |
| --- | --- |
| 打开时默认 50% | 半屏，能看到背景页面 |
| 松手时高于 75% | 吸附到全屏 |
| 松手时低于 25% | 直接退场 |
| 25% 到 75% 之间 | 回到 50% |
| 全屏或接近全屏时快速下扫 | 直接退场 |
| 半屏快速上扫 | 直接全屏 |

添加机器人的抽屉用 `initialRatio={1}` 和 `collapsedRatio={1}`，只有全屏和退场两档，没有半屏。

```tsx
<MobileSheet
  isOpen={isAddOpen}
  onRequestClose={closeAdd}
  onExited={handleExited}
  initialRatio={1}
  collapsedRatio={1}
  ...
>
```

为什么默认半屏。配置抽屉打开时用户通常还想看到背后的机器人列表，半屏足够露出列表上下文，又给了表单足够的操作面积。添加机器人是一个独立任务，全屏减少干扰。

为什么 75% 和 25% 不对称。向上拖到 75% 时，用户已经明确表达了想看完整内容，再让他拖到 100% 会增加一次多余动作。向下拖到 25% 时，抽屉已经只剩一条边，继续留在屏幕上没有意义，直接退场比弹回半屏更符合预期。

### 4.3 打开与关闭

进场从屏幕下方开始，退场滑回屏幕下方。

```ts
const target: SheetState = {
  y: restY,
  footerY: footerYFor(restY, base),
  opacity: SHEET_BACKDROP_ALPHA,
  frameScale: SHEET_FRAME_SCALE,
  frameY: SHEET_FRAME_Y,
}

if (!reverse) {
  commitState(dialog, footer, scrim, frame, {
    y: base,
    footerY: footerYFor(base, base),
    opacity: 0,
    frameScale: 1,
    frameY: 0,
  })
}
```

四个对象同时动，共用一条进度。

| 对象 | 打开前 | 打开后 | 作用 |
| --- | --- | --- | --- |
| dialog | `y = base` | `y = restY` | 抽屉本体 |
| footer | `-0.75 * base` | `-min(restY, 0.75 * base)` | 底栏反向补偿 |
| scrim | 0 | 0.38 | 独立压暗层 |
| frame | `scale(1) translateY(0)` | `scale(0.94) translateY(10px)` | 背后页面缩小后退 |

背景外壳缩小到 0.94 并下移 10px，形成 iOS 卡片堆叠的纵深感。缩放和压暗由 `useSheetMotion` 驱动，拖到 25% 以下时改由手指接管，按进度复原。

压暗层做成抽屉的兄弟节点，不做父级。

```tsx
<Drawer.Backdrop ...>
  <div ref={scrimRef} data-sheet-scrim='' className='pointer-events-none fixed inset-0 bg-black' style={{ opacity: 0 }} />
  <Drawer.Content placement='bottom'>
    <Drawer.Dialog ...>
```

如果压暗层包住抽屉，动 opacity 会把抽屉一起淡掉。拆成兄弟节点后，只动遮罩的 opacity，抽屉的位移和遮罩的明暗互不影响。遮罩只动 opacity 也避免每帧重绘整块全屏背景。

HeroUI 的遮罩本身被固定成透明且不参与动画。

```ts
export const mobileSheetBackdropStyle: CSSProperties = {
  backgroundColor: 'transparent',
  opacity: 1,
  transition: 'none',
  willChange: 'auto',
}
```

HeroUI 在 `[data-entering]` 和 `[data-exiting]` 时会把整块遮罩的 opacity 切到 0。抽屉在这块遮罩里面，退场时抽屉会跟着瞬间消失，位移动画还在跑但肉眼什么都看不到。压暗交给内部 scrim 以后，外层遮罩用内联 `opacity: 1` 固定住。

`isOpen` 用逻辑值，DOM 的保留用 `isExiting`。

```tsx
<Drawer.Backdrop
  ref={backdropRef}
  isOpen={isOpen}
  isExiting={mounted && !isOpen}
  onOpenChange={handleOpenChange}
  isDismissable={false}
  isKeyboardDismissDisabled
  style={mobileSheetBackdropStyle}
>
```

关闭时 React Aria 立即解除背景的 inert，用户不用等退场动画结束就能点背景。DOM 则留到 `onExited` 触发后再卸载。

退场一开始就把抽屉和遮罩的 `pointer-events` 关掉。

```ts
backdrop.style.pointerEvents = 'none'
dialog.style.pointerEvents = 'none'
```

背景卡片在动画第一帧就可以点击。用户想快速关闭再打开另一个机器人时，不需要等 0.5s。

### 4.4 拖动高度

拖动只改位移，不碰高度。

```ts
const applyHeightDrag = (clientY: number) => {
  const height = base()
  if (!height) return

  const rawHeight = dragStartHeight + (dragStartY - clientY)

  if (rawHeight > height) {
    beginScroll(clientY, rawHeight - height)
    return
  }

  const raw = clamp(rawHeight, 0, height)
  visibleHeight = setVisibleHeight(raw)
  applyBackdropRestore(visibleHeight)
}
```

`dragStartHeight` 在手指按下时量一次，之后用起始高度加手指位移。向上拖 `clientY` 变小，高度变大。向下拖相反。不取整，慢速拖动时每帧可能只移动不到 1px，取整会看起来一格一格。

拖到 100% 后继续向上拖，多出来的位移直接转成内容滚动，手势不中断。这一段的细节见 4.5。

拖到 25% 以下时，压暗和外壳缩放跟着手指复原。

```ts
const applyBackdropRestore = (visible: number) => {
  const height = base()
  if (!height) return

  const threshold = height * SHEET_DISMISS_THRESHOLD
  if (threshold <= 0) return

  const restore = clamp((threshold - visible) / threshold, 0, 1)
  const progress = restore <= 0 ? 0 : restore >= 1 ? 1 : EASE_POWER3_OUT(restore)
  if (progress === lastRestore) return
  lastRestore = progress

  if (progress > 0) stopBackdropMotion()

  if (scrim) scrim.style.opacity = String(SHEET_BACKDROP_ALPHA * (1 - progress))
  if (frame) {
    frame.style.transform = `translate3d(0, ${SHEET_FRAME_Y * (1 - progress)}px, 0) scale(${
      SHEET_FRAME_SCALE + (1 - SHEET_FRAME_SCALE) * progress
    })`
  }
}
```

可见高度从 25% 降到 0 的过程中，背景从压暗 0.38 回到全亮，外壳从 0.94 回到 1。用户向下拖的时候，背景跟着“亮起来”，松手前就能预判抽屉要关闭。这个反馈比单纯把抽屉拖走更有说服力。

`EASE_POWER3_OUT(restore)` 让背景复原在前段更快，手指刚越过 25% 时背景明显变亮，后段变缓，避免完全到底时突然跳亮。

### 4.5 交接给内容滚动

从半屏一拖到全屏后不松手，继续向上拖会接着滚内容。这是整套交互里最容易被做坏的一段。

```ts
const beginScroll = (clientY: number, excess: number) => {
  const height = base()
  if (!height) return

  visibleHeight = setVisibleHeight(height)
  applyBackdropRestore(visibleHeight)

  active = false
  scrollActive = true
  scrollStartTop = scroller.scrollTop
  scrollStartY = clientY + excess
  setScrollTop(scrollStartTop + excess)
  scrollSamples = [{ t: performance.now(), value: scroller.scrollTop }]
}
```

`scrollStartY = clientY + excess` 是关键。手指当前位置减去 `scrollStartY`，正好等于已经滚过的 `excess`。交接点没有跳变。

手指按住期间用 JS 写 `scrollTop`，和原生滚动一样跟手。松手后改把离手速度交给 WAAPI 平移内容层。原因见 4.7。

交接时故意不恢复 `overflow`。如果本次手势是从原生滚动接管来的，恢复后浏览器可能又在同一次触摸里滚动，和 JS 写的 `scrollTop` 叠加成双倍位移。手势结束或下一次 `touchstart` 再恢复。

### 4.6 内容回顶后接回收起

全屏状态下内容已经滚到顶部，用户继续向下拉，手势要能接回抽屉收起。

触摸事件已经被浏览器锁进滚动，`preventDefault` 不再有效。做法是在原生滚动阶段持续观察手指位置。

```ts
if (nativeTracking) {
  const moveDy = touch.clientY - lastNativeY
  lastNativeY = touch.clientY
  pushFlickSample(nativeSamples, touch.clientY)

  if (scroller.scrollTop <= 1 && moveDy > 0) {
    if (topPullStartY === null) topPullStartY = touch.clientY
    if (touch.clientY - topPullStartY >= DRAG_START) {
      takeOverNativeScroll(touch.clientY, topPullStartY)
    }
  } else if (moveDy < 0) {
    topPullStartY = null
  }
  return
}
```

接管时把 `overflowY` 设成 `hidden`，浏览器立刻停住滚动。手指回推时内容也不会再自己滚起来。

```ts
const takeOverNativeScroll = (clientY: number, origin: number) => {
  nativeTracking = false
  topPullStartY = null
  scroller.style.overflowY = 'hidden'
  overflowHidden = true
  scroller.scrollTop = 0
  beginDrag(origin)
  dragStartClientY = origin
  dragSamples = nativeSamples.slice()
  nativeSamples = []
  applyHeightDrag(clientY)
}
```

`scrollTop` 用 `<= 1`，不用 `<= 0`。高刷屏的滚动位置可能是小数，顶部还差半像素时收不起来，用户会觉得卡住。

速度采样沿用原生阶段的最后几次移动。否则“滚到顶后顺势快速下扫”会在离手时丢掉速度，被当成慢拖，抽屉只回半屏而不退场。

### 4.7 离手惯性

交接过来的内容滚动，松手后按指数衰减做惯性。

```ts
const MOMENTUM_TAU = 480
const MOMENTUM_MIN_VELOCITY = 0.02
const MOMENTUM_MAX_VELOCITY = 4
const FLING_STEPS = 120
```

速度模型是 `v(t) = v0 * exp(-t / τ)`。τ 取 480ms，和之前手写惯性的手感一致。

```ts
const total = MOMENTUM_TAU * (initial - Math.sign(initial) * MOMENTUM_MIN_VELOCITY)
const distance = clamp(total, -from, max - from)
const covered = distance / (MOMENTUM_TAU * initial)
const duration = -MOMENTUM_TAU * Math.log(1 - covered)

const k = duration / MOMENTUM_TAU
const normal = 1 - Math.exp(-k)

flingAnimation = animateProgress(
  content,
  (progress) => ({ transform: `translate3d(0, ${-distance * progress}px, 0)` }),
  (t) => (1 - Math.exp(-t * k)) / normal,
  duration / 1000,
  () => {
    flingAnimation = null
    scroller.scrollTop = from + distance
    content.style.transform = ''
    content.style.willChange = ''
  },
  FLING_STEPS
)
```

几个边界处理。

- 初速度限制在 ±4 px/ms，避免异常采样把内容甩飞。
- 理论总位移到边界就截断，并缩短动画时长，不会先滚到底再空转。
- 时长小于 16ms 直接放弃，不值得启动一个动画。
- 结束时一次性把位移写回 `scrollTop`，视觉位置不变，之后继续走原生滚动。

为什么不用 JS 每帧写 `scrollTop`。`scrollTop` 是布局属性，每帧写都会让浏览器重新计算滚动位置，主线程一忙就掉帧。平移内容层是 `transform`，由合成器驱动，和原生滚动同一档流畅度。

内容层包含上下内边距。

```tsx
<div data-sheet-content='' style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
  {children}
</div>
```

惯性平移这一层时，位移必须连内边距一起算，视觉位置才和真正写 `scrollTop` 一致。如果内边距在外层，平移内容会少掉一段，结束写回时会跳一下。

### 4.8 吸附

松手后的目标高度按四个分支决定。

```ts
let targetRatio: number | null = null

if (flickDown) {
  const nearFull = dragStartRatio >= SHEET_EXPAND_THRESHOLD || current >= SHEET_EXPAND_THRESHOLD
  targetRatio = collapsedRatio >= 0.999 || nearFull || current <= collapsedRatio + 0.001
    ? null
    : collapsedRatio
} else if (flickUp) {
  targetRatio = current >= collapsedRatio ? 1 : collapsedRatio
} else if (current < SHEET_DISMISS_THRESHOLD) {
  targetRatio = null
} else {
  targetRatio = collapsedRatio >= 0.999
    ? 1
    : current > SHEET_EXPAND_THRESHOLD
      ? 1
      : collapsedRatio
}
```

`null` 表示退场，其余表示吸附到对应比例。

快速下扫的判断用起手位置和当前位置里更高的那个。从全屏或接近全屏快速下扫直接退场，不需要先回半屏再让用户扫第二次。慢速拖动仍然回到半屏。已经拖到 75% 以下再下扫，也回半屏。`collapsedRatio` 为 1 的抽屉没有半屏状态，下扫始终退场。

吸附动画和进出场使用同一组时长与曲线。

```ts
const dialogAnimation = animateProgress(
  dialog,
  (progress) => ({
    transform: `translate3d(0, ${fromY + (endY - fromY) * progress}px, 0)`,
  }),
  EASE_POWER3_OUT,
  SHEET_SNAP_DURATION,
  () => {
    ...
    dialog.dataset.sheetRestY = String(endY)
    setExpanded(expanded)
  }
)
```

吸附期间 `touch-action` 保持 `none`，不让浏览器接管手势。停稳后才在回调里切到 `pan-y`。

```ts
scroller.style.touchAction = 'none'
...
setExpanded(expanded)  // 内部 syncTouchAction()
```

如果吸附一开始就把 `touch-action` 改成 `pan-y`，用户在动画途中再次触摸，浏览器可能把手势锁进滚动，抽屉高度和内容滚动会同时动。

已经在目标高度上时不空跑动画。

```ts
if (Math.abs(visibleHeight - target) < 0.5) {
  visibleHeight = setVisibleHeight(target)
  dialog.dataset.sheetRestY = String(height - target)
  setExpanded(expanded)
  return
}
```

正好拖到 100% 松手，用户已经到位，再播一段 0.5s 的原地动画只会让界面显得迟钝。

### 4.9 顶栏、底栏与边缘模糊

`SheetScaffold` 把顶栏和底栏固定在骨架上下边缘，滚动内容从它们下面经过。

```tsx
<div className='relative min-h-0 flex-1 overflow-hidden'>
  <div ref={scrollerRef} className='... h-full overflow-y-auto overscroll-contain px-4'>
    <div data-sheet-content='' style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {children}
    </div>
  </div>

  <EdgeBlur edge='top' tone='surface' rounded className='z-20' />

  <div ref={headerRef} className='absolute inset-x-0 top-0 z-30'>
    {header}
  </div>
  {footer ? (
    <div ref={footerRef} data-sheet-footer='' className='absolute inset-x-0 bottom-0 z-30'>
      <EdgeBlur edge='bottom' tone='surface' className='z-0' />
      <div className='relative z-10'>{footer}</div>
    </div>
  ) : null}
</div>
```

滚动容器的上下内边距按顶栏和底栏的实际高度测量，各加 8px。

```ts
const EDGE_GAP = 8

const measure = () => {
  setInsets({
    top: (headerNode?.offsetHeight ?? 0) + EDGE_GAP,
    bottom: (footerNode?.offsetHeight ?? 0) + EDGE_GAP,
  })
}
```

`ResizeObserver` 观察顶栏和底栏，顶栏因为安全区变化而变高时，内容内边距跟着变。

顶栏和底栏都不铺底色。内容从下面滚过时，由三层不同半径的模糊把文字逐渐化开。没有底栏的抽屉不渲染底部模糊，省掉一层。

顶栏在全屏时让开刘海。

```ts
const EXPANDED_HEADER_PADDING = 'max(0.5rem, env(safe-area-inset-top))'

export const syncSheetChrome = (dialog: HTMLElement | null | undefined) => {
  if (!dialog) return
  const expanded = dialog.dataset.sheetExpanded === 'true'
  const header = dialog.querySelector<HTMLElement>('[data-sheet-header]')
  if (header) header.style.paddingTop = expanded ? EXPANDED_HEADER_PADDING : ''
}
```

半屏时顶栏离屏幕顶部还有距离，不需要安全区。全屏时顶栏贴着屏幕顶部，必须让开刘海和状态栏。

这里有一个反直觉的决定。顶栏底色和顶部模糊层在拖动、吸附、进出场期间完全不切换。

早期版本在 `data-resizing` 和 `data-animating` 时把顶栏底色改成 92% 的实色，并把三层模糊 `display: none`。结果有三个。

- 拖动高度时，滚到顶栏下面的表单被一块半透明白底盖住，模糊渐变消失。
- 展开手势交接给内容滚动时，三层 `backdrop-filter` 在同一帧重新出现，安卓上会闪一下。
- 吸附结束和进出场时同样会切，顶栏头像和名字跟着闪。

现在的判断是这些切换没有必要。抽屉在拖动和进出场时是整块平移，模糊层和它下面的内容相对静止，重新取样没有意义。原生内容滚动本来就每帧重新采样模糊，已经被接受；纯平移不可能比它更贵。保持常开以后，顶栏在停稳、拖动中、交接瞬间、原生滚动四种状态下完全一致。

抽屉的圆角同时写物理和逻辑属性。

```ts
export const mobileSheetStyle: CSSProperties = {
  padding: 0,
  borderRadius: '28px 28px 0 0',
  borderTopLeftRadius: '28px',
  borderTopRightRadius: '28px',
  borderStartStartRadius: '28px',
  borderStartEndRadius: '28px',
  translate: 'none',
  transition: 'none',
}
```

部分安卓浏览器在 `overflow` 加 `backdrop-filter` 的组合下会按逻辑属性绘制，只写 `border-radius` 会丢圆角。`translate: none` 和 `transition: none` 用来关掉 HeroUI 自带的位移动画，避免和 `useSheetMotion` 的 `transform` 叠加。

### 4.10 键盘模式

输入法弹出会改变视觉视口高度，而 dialog 的高度是打开时定死的像素值。不处理的话，dialog 会比视口高，被 flex 底部对齐顶出屏幕上方，看起来就是整个页面被输入法往上抬了一截。半屏时更糟，键盘占掉大半屏幕，半屏只剩顶栏和底栏，输入框被底栏盖住。

`index.html` 的 viewport 声明开启了 `interactive-widget=resizes-content`。

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
/>
```

React Aria 的 `[data-slot="drawer-content"]` 高度跟随 `--visual-viewport-height`。抽屉观察这个容器，不直接读 `visualViewport`。iOS 关闭键盘时 RAC 会提前把高度还回来，两边各按各的节奏的话，抽屉会在键盘收起过程中跳一下。

```ts
const viewportWrapper = dialog.closest<HTMLElement>('[data-slot="drawer-content"]')
const openBase = base()
const openFrameHeight = frame?.offsetHeight ?? 0

const syncViewport = () => {
  if (!viewportWrapper) return
  const height = Math.round(viewportWrapper.clientHeight)
  if (!height) return

  const shrunk = height <= openBase - KEYBOARD_THRESHOLD
  const grown = height >= openBase + KEYBOARD_THRESHOLD

  if (shrunk && (keyboardMode || isEditing())) {
    if (!keyboardMode) {
      setKeyboardMode(true)
      preKeyboardRatio = clamp(measureVisible() / base(), collapsedRatio, 1)
      if (frame && openFrameHeight) frame.style.height = `${openFrameHeight}px`
    }
    resizeSheetBase(height, 1)
    return
  }

  if (keyboardMode) {
    setKeyboardMode(false)
    if (frame) frame.style.height = ''
    resizeSheetBase(Math.max(openBase, height), preKeyboardRatio)
    return
  }

  if (grown && !isEditing()) resizeSheetBase(height)
}
```

`KEYBOARD_THRESHOLD` 取 100px。地址栏展开收起通常只有几十像素，不会被当成键盘。

键盘弹出后强制铺满可见区域。

```ts
resizeSheetBase(height, 1)
```

`forcedRatio = 1` 让抽屉直接填满键盘以上的空间。iOS 原生抽屉弹键盘时也是这么做的。半屏方案在键盘弹出后没有可用面积，输入框必然被底栏盖住。

弹键盘前的比例记在 `preKeyboardRatio`，收起后回到原来的位置。

```ts
preKeyboardRatio = clamp(measureVisible() / base(), collapsedRatio, 1)
```

下限取 `collapsedRatio`。进场动画中途就弹键盘时，量到的是中间值，不夹一下会把抽屉留在半截。

背景页面高度在键盘期间冻结。

```ts
if (frame && openFrameHeight) frame.style.height = `${openFrameHeight}px`
```

安卓的 `resizes-content` 会让列表跟着重排，抽屉关闭后页面高度恢复，列表会跳一下。冻结以后背景不动，只有抽屉在变。

Safari 的浮动表单栏和键盘之间会露出一条页面。抽屉下面补一块同色块盖住。

```tsx
<div
  aria-hidden='true'
  data-sheet-bleed=''
  hidden
  className='pointer-events-none fixed inset-x-0 h-32 bg-surface'
  style={{ top: 'var(--visual-viewport-height)' }}
/>
```

键盘模式下取消 `hidden`，看起来像抽屉一直延伸到键盘下面。

焦点输入框可能落在底栏下面。露出的逻辑只滚抽屉自己的滚动容器。

```ts
const revealActiveInput = () => {
  const focused = document.activeElement
  if (!content || !(focused instanceof HTMLElement) || !scroller.contains(focused)) return

  const vv = window.visualViewport
  const viewTop = vv?.offsetTop ?? 0
  const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
  const box = scroller.getBoundingClientRect()
  const header = dialog.querySelector<HTMLElement>('[data-sheet-header]')
  const headerBottom = header?.getBoundingClientRect().bottom ?? box.top
  const footerTop = footer?.getBoundingClientRect().top ?? viewBottom

  const rect = focused.getBoundingClientRect()
  const top = Math.max(box.top, viewTop, headerBottom + INPUT_EDGE_GAP)
  const bottom = Math.min(box.bottom, viewBottom, footerTop - INPUT_EDGE_GAP)

  let delta = 0
  if (rect.top < top) delta = rect.top - top
  else if (rect.bottom > bottom) delta = rect.bottom - bottom
  if (Math.abs(delta) < 1) return

  setScrollTop(scroller.scrollTop + delta)
}
```

这里不能调用 `scrollIntoView`。它会连带滚动页面，在 iOS 上表现为整个页面被顶上去。只写抽屉自己的 `scrollTop`。

可见区不能用滚动容器的 `rect`。dialog 是底部对齐后整体下移的，滚动容器的下半截其实在键盘后面。可见区要用视觉视口和悬浮底栏一起夹。

`revealSoon` 先排一帧，再补一个 150ms 的延时。

```ts
const revealSoon = () => {
  if (revealFrame) cancelAnimationFrame(revealFrame)
  if (revealTimer) window.clearTimeout(revealTimer)
  revealFrame = requestAnimationFrame(() => {
    revealFrame = 0
    revealActiveInput()
  })
  revealTimer = window.setTimeout(() => {
    revealTimer = 0
    revealActiveInput()
  }, 150)
}
```

iOS 在切换输入框时自己也会滚一次滚动容器。延时那一次等它落定后再校正，免得输入框最后停在悬浮底栏下面。

键盘已经弹出时再切换输入框，视口不会再变，`ResizeObserver` 不会触发。`focusin` 里补一次铺满和露出。

```ts
const keyboardOpen =
  keyboardMode || height <= Math.round(document.documentElement.clientHeight) - KEYBOARD_THRESHOLD
```

iOS 上布局视口不变，只有 `drawer-content` 变矮，用两者的差值判断键盘是否开着。

键盘关闭后，抽屉长回原来的高度，比例回到 `preKeyboardRatio`。如果打开抽屉时键盘就已经开着，`openBase` 是当时的矮视口，收起后要长回现在的视口高度。

```ts
resizeSheetBase(Math.max(openBase, height), preKeyboardRatio)
```

### 4.11 关闭方式

关闭有三条路径。

| 路径 | 触发 | 行为 |
| --- | --- | --- |
| 点遮罩 | `backdrop` 上直接点击 | `onRequestClose()` |
| 拖到 25% 以下松手 | 慢速拖动 | 从当前位置退场 |
| 全屏快速下扫 | 离手速度达标 | 直接退场 |
| 关闭按钮 | 顶栏按钮 | `onRequestClose()` |
| Esc | 桌面键盘 | React Aria 处理 |

HeroUI 的 outside dismiss 被关掉了。

```tsx
isDismissable={false}
isKeyboardDismissDisabled
```

原因是 Select 的 portal 弹层会被当成抽屉外部。iOS 上打开下拉框时，弹层一出现就会把整个抽屉关掉。现在只保留点遮罩关闭，手动判断点击目标。

```ts
const handleClick = (event: MouseEvent) => {
  if (event.target === backdrop) onRequestClose()
}
```

`isKeyboardDismissDisabled` 关掉的是 HeroUI 自己的 Esc 处理，桌面端的 `ConfirmDialog` 仍然可以正常用键盘关闭。

### 4.12 与其他浮层的冲突

抽屉里可能同时出现 Select 弹层、AlertDialog、Toast。

- Select 弹层用 portal 挂到 body，`z-index` 高于抽屉。
- 移除机器人的 AlertDialog 用 `zIndex: 100010`，高于粒子画布的 100000。
- 保存提示 portal 到 body，`z-index: 100001`。
- 粒子画布 `z-index: 100000`，`pointer-events: none`。

层级顺序保证粒子不会盖住确认框，确认框不会盖住保存提示，保存提示不会盖住粒子。

### 4.13 参数总表

| 参数 | 值 | 位置 |
| --- | --- | --- |
| 默认高度 | 可用高度 50% | `SHEET_COLLAPSED_RATIO` |
| 全屏吸附阈值 | 75% | `SHEET_EXPAND_THRESHOLD` |
| 退场阈值 | 25% | `SHEET_DISMISS_THRESHOLD` |
| 底栏补偿上限 | 75% 的 base | `FOOTER_FLOOR` |
| 进出场时长 | 0.5s | `SHEET_ENTER_DURATION` |
| 吸附时长 | 0.5s | `SHEET_SNAP_DURATION` |
| 压暗不透明度 | 0.38 | `SHEET_BACKDROP_ALPHA` |
| 外壳缩放 | 0.94 | `SHEET_FRAME_SCALE` |
| 外壳位移 | 10px | `SHEET_FRAME_Y` |
| 拖动死区 | 6px | `DRAG_START` |
| 点击抑制 | 200ms | `CLICK_SUPPRESS` |
| 键盘判定阈值 | 100px | `KEYBOARD_THRESHOLD` |
| 输入框与栏间距 | 8px | `INPUT_EDGE_GAP` |
| 惯性时间常数 | 480ms | `MOMENTUM_TAU` |
| 惯性最小速度 | 0.02 px/ms | `MOMENTUM_MIN_VELOCITY` |
| 惯性最大速度 | 4 px/ms | `MOMENTUM_MAX_VELOCITY` |
| 惯性关键帧 | 120 | `FLING_STEPS` |
| 顶部圆角 | 28px | `mobileSheetStyle` |
| 抽屉边框 | `border-border/60` | `MobileSheet.tsx` |
| 抽屉阴影 | 无 | `shadow-none` |

### 4.14 复刻步骤

1. 用固定像素高度做 dialog，打开时量一次可用高度。
2. 收起时整体 `translate3d(0, base - visible, 0)`，不要改 `height`。
3. 底栏放进独立容器，按 `-min(y, 0.75 * base)` 反向平移。
4. 压暗层做成抽屉的兄弟节点，只动 opacity。
5. 进出场和吸附共用 0.5s power3.out，用 WAAPI。
6. 拖动只写 transform，每帧最多写一次。
7. 到 100% 后继续上拖，把多余位移写进 `scrollTop`，松手交给 WAAPI 惯性。
8. 内容回顶后继续下拉，用 `overflow: hidden` 停住原生滚动，再接管成高度拖动。
9. 键盘弹出时跟着 `drawer-content` 改 base 并强制铺满，收起后回到原比例。
10. 顶栏底色和模糊层全程不切换。

---

## 5. 边缘渐进模糊

### 5.1 结构

`EdgeBlur` 用三层 `backdrop-filter` 叠出渐进模糊，不铺任何底色。

```tsx
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
```

每一层的遮罩把模糊限制在靠近边缘的一段。

```tsx
const LAYER_MASK: Record<Edge, Record<Layer, string>> = {
  top: {
    strong:
      '[mask-image:linear-gradient(to_bottom,black_0%,black_50%,transparent_100%)]',
    medium:
      '[mask-image:linear-gradient(to_bottom,black_0%,black_42%,transparent_100%)]',
    soft:
      '[mask-image:linear-gradient(to_bottom,black_0%,black_30%,transparent_100%)]',
  },
  bottom: {
    strong:
      '[mask-image:linear-gradient(to_top,black_0%,black_50%,transparent_100%)]',
    medium:
      '[mask-image:linear-gradient(to_top,black_0%,black_42%,transparent_100%)]',
    soft:
      '[mask-image:linear-gradient(to_top,black_0%,black_30%,transparent_100%)]',
  },
}
```

容器高度默认 96px，顶栏变体 84px。顶部圆角 28px，和抽屉一致。

```tsx
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
```

### 5.2 为什么叠三层

单层 `backdrop-filter` 在遮罩边缘会留下一条能看出来的分界，像一条硬边。三层不同半径、不同高度、不同遮罩的组合，让模糊强度从边缘往内容方向连续衰减。

- 最强的一层只有 30px 高，8px 半径，负责边缘附近的文字完全化开。
- 中间层 54px 高，3px 半径，负责过渡。
- 最弱的一层 84px 高，1.25px 半径，负责把过渡的尾端抹平。

三层都不铺底色，所以内容被模糊以后仍然能看出轮廓和明暗。这比一层半透明白底更接近 iOS 的滚动边缘效果，也不会在深色主题下变成一块灰雾。

### 5.3 兜底与降级

浏览器不支持 `backdrop-filter` 时退回一层渐变底色。

```tsx
const FALLBACK: Record<Tone, Record<Edge, string>> = {
  background: {
    top: '[@supports_not_(backdrop-filter:blur(1px))]:bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_90%,transparent)_0%,transparent_100%)]',
    bottom: '[@supports_not_(backdrop-filter:blur(1px))]:bg-[linear-gradient(to_top,color-mix(in_oklab,var(--background)_90%,transparent)_0%,transparent_100%)]',
  },
  surface: {
    top: '[@supports_not_(backdrop-filter:blur(1px))]:bg-surface/92',
    bottom: '[@supports_not_(backdrop-filter:blur(1px))]:bg-surface/92',
  },
}
```

减少透明度时直接盖实色，不再叠模糊。

```tsx
'[@media(prefers-reduced-transparency:reduce)]:hidden'
```

这一条加在每一层模糊上，容器本身用 `REDUCED` 里的实色渐变。用户要求减少透明度时，模糊不再是可选项。

### 5.4 使用位置

| 位置 | edge | tone | 高度 | 圆角 |
| --- | --- | --- | --- | --- |
| 抽屉顶部 | top | surface | 96px | 28px |
| 抽屉底栏上方 | bottom | surface | 96px | 无 |
| 手机底部导航上方 | bottom | surface | 96px | 无 |
| 桌面列表顶部 | top | background | 96px | 无 |
| 桌面列表底部 | bottom | background | 96px | 无 |
| 桌面表单顶栏 | top | background | 84px | 无 |

抽屉用 `surface`，因为模糊层下面是抽屉自己的表面色。列表和表单用 `background`，因为下面是页面底色。

桌面列表标题后面另有单独一层模糊，参数和 `EdgeBlur` 不同。

```tsx
<div
  aria-hidden='true'
  className={cn(
    'pointer-events-none absolute inset-x-0 top-0 -bottom-2.5 -z-10',
    'bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_84%,transparent)_0%,color-mix(in_oklab,var(--background)_52%,transparent)_62%,transparent_100%)]',
    'backdrop-blur-[12px] backdrop-saturate-[1.4]',
    '[mask-image:linear-gradient(to_bottom,black_0%,black_52%,transparent_100%)]',
    ...
  )}
/>
```

标题不铺实心底色，卡片从下面滚过时被 12px 模糊化开，不会出现一条硬边。`backdrop-saturate(1.4)` 让模糊后的颜色不至于发灰。

### 5.5 与抽屉手势的关系

`EdgeBlur` 在抽屉拖动、吸附、进出场期间保持显示，不做任何 `display` 切换。

原因在 4.9 已经说过。这里补一个性能角度的判断。原生内容滚动时，浏览器本来就要每帧重新采样这三层 `backdrop-filter`，这个成本已经被接受。抽屉拖动是整块平移，模糊层和它下面的内容相对静止，采样结果不变，成本只会更低。中途切 `display` 反而会销毁再重建合成层，安卓上会闪一帧。

---

## 6. 手机端顶层横向分页

### 6.1 结构

`MobilePager` 把机器人列表和概览两页横向排在一张轨道上，当前页由 `activeKey` 决定。

```tsx
<div ref={rootRef} role='group' className='relative h-full touch-pan-y overflow-hidden ...'>
  <div ref={trackRef} className='flex h-full w-full will-change-transform'>
    {items.map((item, index) => (
      <section
        key={item.key}
        className='mobile-panel h-full w-full shrink-0 overflow-y-auto overscroll-contain px-4 ...'
        aria-hidden={index !== activeIndex}
        inert={index !== activeIndex}
      >
        {item.element}
      </section>
    ))}
  </div>
</div>
```

两页同时挂载，各自保留滚动位置。切换页面不会重新请求数据，也不会丢掉列表滚到一半的位置。

### 6.2 为什么自己接管横向手势

没有用原生横向滚动容器。原因有三个。

- 原生横向滚动在鼠标拖动下不可靠，桌面浏览器不会把鼠标拖动当成滚动。
- Safari 的嵌套滚动里，横向手势容易被外层纵向滚动抢走。
- 某些安卓浏览器对 `overflow-x: auto` 加 `touch-action` 的组合处理不一致。

自己接管以后，横向位移由内联 `transform` 直接驱动，纵向仍然交给浏览器。`touch-pan-y` 只允许纵向原生滚动，横向手势留给 JS。

### 6.3 手势参数

| 参数 | 值 | 作用 |
| --- | --- | --- |
| `AXIS_LOCK` | 8px | 死区 |
| 轴向比例 | 1.2 | 横向位移大于纵向 1.2 倍才锁定 |
| 边缘阻尼 | 0.35 | 第一页继续右滑、最后一页继续左滑时位移乘 0.35 |
| `SWIPE_RATIO` | 0.2 | 距离阈值是页宽的 20% |
| `SNAP_DURATION` | 0.32s | 吸附时长 |
| 点击抑制 | 140ms | 拖动后拦 click |
| 滚轮阈值 | 60 | 横向滚轮累计 60 才切页 |
| 滚轮冷却 | 360ms | 两次切页之间至少隔 360ms |

边缘阻尼让用户知道已经到头了，但不会硬停。手指继续拖，页面还能动一点，松手弹回。

### 6.4 跟手与吸附

拖动时每帧最多写一次 transform。

```ts
const scheduleTrackX = (x: number) => {
  pendingX = x
  if (frameId) return
  frameId = requestAnimationFrame(applyPendingX)
}
```

松手后按距离或速度决定是否翻页。

```ts
const commitHorizontal = (start: number, end: number, releaseVelocity: number) => {
  const pageWidth = dragWidth || root.clientWidth
  if (!pageWidth) return

  const index = indexRef.current
  const dx = end - start
  const step = dx < 0 ? 1 : -1
  const distance = Math.abs(dx)
  const velocity = releaseVelocity * (dx < 0 ? -1 : 1)
  const turn = shouldAdvance(distance, velocity, pageWidth * SWIPE_RATIO)
  const nextIndex = turn ? Math.max(0, Math.min(itemsRef.current.length - 1, index + step)) : index

  indexRef.current = nextIndex
  setTrack(-nextIndex * pageWidth, true)
  suppressClickUntil = performance.now() + 140

  if (nextIndex !== index) {
    const next = itemsRef.current[nextIndex]
    if (next) onChangeRef.current(next.key)
  }
}
```

吸附动画等两帧再启动，理由和抽屉一样。翻页同时触发路由更新和 inert 切换，主线程会被占住几十毫秒。

```ts
snapStartRef.current = requestAnimationFrame(() => {
  snapStartRef.current = 0
  snapStart2Ref.current = requestAnimationFrame(() => {
    ...
    const from = readTranslate(node, 'x')
    trackAnimationRef.current = animateProgress(
      node,
      (progress) => ({ transform: `translate3d(${from + (target - from) * progress}px, 0, 0)` }),
      EASE_POWER3_OUT,
      SNAP_DURATION,
      () => {
        trackAnimationRef.current = null
        node.style.transform = `translate3d(${target}px, 0, 0)`
      }
    )
  })
})
```

### 6.5 路由同步

页面切换先动轨道，再通知路由。

```ts
if (nextIndex !== index) {
  const next = itemsRef.current[nextIndex]
  if (next) onChangeRef.current(next.key)
}
```

`MobileShell` 收到 key 后用 `replace` 导航。

```ts
const handlePagerChange = (key: string) => {
  const tab = tabs.find((item) => item.key === key)
  if (tab) navigate(tab.to, { replace: true })
}
```

用 `replace`，不用 `push`，避免用户按返回键时在两页之间来回跳。顶层分页是同一层级的切换，不应该产生历史记录。

`activeKey` 变化时 `useLayoutEffect` 也会把轨道对齐到新页。外部导航和手势翻页走同一条路径。

### 6.6 窗口尺寸变化

窗口宽度变化时按当前页重新对齐，不播动画。

```ts
const observer = new ResizeObserver(() => {
  if (draggingRef.current) return
  const track = trackRef.current
  if (!track) return
  cancelSnapStart()
  stopTrackAnimation()
  track.style.transform = `translate3d(${-indexRef.current * root.clientWidth}px, 0, 0)`
})
```

拖动过程中跳过。拖动时 `dragWidth` 已经在手势开始时量过，中途改宽度会让位移基准错乱。

### 6.7 滚轮

横向滚轮只在横向增量大于纵向时处理。

```ts
if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return

event.preventDefault()
wheelAccum += event.deltaX
window.clearTimeout(wheelTimer)
wheelTimer = window.setTimeout(() => {
  wheelAccum = 0
}, 180)

if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return

const now = performance.now()
if (now - lastWheelSwitch < WHEEL_COOLDOWN) return
```

触控板的横向滑动会连续发很多小增量，累计到 60 才切页，切页后冷却 360ms。这样一次轻扫只翻一页，不会连续翻好几页。

---

## 7. 分段标签、拖拽选择与抽屉内左右轻扫

### 7.1 分段标签的视觉

`MobileSegmentedTabs` 用 HeroUI 的 Tabs 做无障碍和指示器动画，外观改成 iOS 分段控件。

```tsx
<Tabs.List
  aria-label={ariaLabel}
  className='grid gap-1 rounded-xl bg-default p-1'
  style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
>
  {items.map((item) => (
    <Tabs.Tab
      key={item.key}
      id={item.key}
      className='h-9 min-w-0 justify-center gap-1.5 rounded-lg px-1 text-[11px] font-medium data-[selected=true]:text-foreground'
    >
      {Icon ? <Icon className='size-3.5' aria-hidden='true' /> : null}
      <span className='truncate'>{item.label}</span>
      <Tabs.Indicator className='rounded-lg bg-surface shadow-sm' />
    </Tabs.Tab>
  ))}
</Tabs.List>
```

高度 36px，外层内边距 4px，圆角 12px，指示器圆角 8px。选中指示器在等宽标签之间连续移动，由 HeroUI 的 indicator 负责。

手机端不用桌面那三张大卡片。三张卡片每张至少 100px 高，加说明文字会占掉半屏，而这里只需要选一个连接方式。

### 7.2 按住拖选

`useDragSelect` 让用户按住标签栏横向移动，手指经过哪个标签就选中哪个。

```ts
const selectAt = (x: number) => {
  const tabs = Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
  if (tabs.length === 0) return

  let index = -1
  let distance = Infinity

  tabs.forEach((tab, i) => {
    if (tab.getAttribute('aria-disabled') === 'true' || tab.hasAttribute('data-disabled')) return
    const rect = tab.getBoundingClientRect()
    const next = Math.abs(x - (rect.left + rect.width / 2))
    if (next < distance) {
      distance = next
      index = i
    }
  })

  if (index < 0 || index === lastIndex) return

  lastIndex = index
  onSelectRef.current(index)
}
```

按手指位置选最近的标签中心，不要求手指正好落在标签矩形内。手指在标签间隙、或者上下稍微漂移时，选中仍然跟着走。

轴向判定用 6px 死区和 1.2 倍比例。纵向手势直接放弃，交给抽屉。

拖拽结束后拦掉 `pointerup` 和 `click`，避免 React Aria 的 press 把选中改回按下的那个标签。

### 7.3 抽屉内左右轻扫

扫码和手动添加两个标签支持在整块抽屉上左右轻扫。手势挂在 dialog 上，顶栏和表单空白处都能扫。

```ts
const swipeTarget = panel.closest<HTMLElement>('[data-slot="drawer-dialog"]') ?? panel
```

标签栏、输入框、按钮不参与轻扫，靠 `INTERACTIVE_SELECTOR` 排除。

判定和横向分页一致。

| 参数 | 值 |
| --- | --- |
| 死区 | 8px |
| 轴向比例 | 1.2 |
| 最小距离 | 48px |
| 距离阈值 | 面板宽的 20% |
| 轻扫速度阈值 | 0.45 px/ms |
| 滑入时长 | 0.32s |
| 滑入位移 | 24px |

滑入动画只移动 24px。

```ts
const animation = animateProgress(
  panel,
  (progress) => ({
    transform: `translate3d(${intent.direction * SWIPE_ANIM_OFFSET * (1 - progress)}px, 0, 0)`,
  }),
  EASE_POWER3_OUT,
  SWIPE_ANIM_DURATION,
  () => {
    panel.style.transform = ''
  }
)
```

为什么只滑 24px。标签内容切换是瞬时的，整页滑动需要给旧内容拍快照，否则会看到新内容从空白里滑进来。24px 的短距离滑入只负责表达方向，成本低，也不会让用户以为两个标签之间还有中间状态。

方向由手势决定。左滑切到下一个标签，面板从右侧 24px 处滑入；右滑相反。

```ts
const step = dx < 0 ? 1 : -1
...
swipeIntentRef.current = { direction: step, key: next.key }
onSelectionChangeRef.current(next.key)
```

意图存在 ref 里，等 `selectedKey` 变化后的 `useLayoutEffect` 消费。这样动画和 React 的状态更新对齐，不会在旧面板上先滑一下。

### 7.4 标签内容不卸载

添加机器人的两个面板用 `shouldForceMount` 保持挂载。

```tsx
<Tabs.Panel id='qr' shouldForceMount style={{ display: mode === 'qr' ? undefined : 'none' }}>
  <QrPanel />
</Tabs.Panel>
<Tabs.Panel id='manual' shouldForceMount style={{ display: mode === 'manual' ? undefined : 'none' }}>
  <MobileManualAddForm />
</Tabs.Panel>
```

扫码面板里有一个正在轮询的授权会话。切到手动填写再切回来，二维码不能重新生成，否则用户刚扫的码会失效。只有退出抽屉或点“重新生成”才结束会话。

`sessionKey` 在抽屉完全退场后自增，下一次打开是全新的会话。

```ts
const handleExited = useCallback(() => {
  setSessionKey((value) => value + 1)
  setMode('qr')
}, [])
```

---

## 8. 桌面画布与表单翻页

### 8.1 纵向画布

桌面端的页面不会在路由切换后重新挂载。所有页面同时挂在一张纵向轨道上。

```tsx
<div ref={rootRef} className='relative h-full w-full overflow-hidden' role='group' aria-label='页面画布'>
  <div ref={trackRef} className='flex h-full w-full flex-col will-change-transform'>
    {pages.map((page, index) => (
      <section
        key={page.key}
        data-canvas-page=''
        aria-hidden={index !== activeIndex}
        inert={index !== activeIndex}
        className='... h-full w-full shrink-0 overflow-y-auto overscroll-contain'
      >
        <div className='mx-auto w-full max-w-[78rem] px-6 py-6 ...'>
          {page.element}
        </div>
      </section>
    ))}
  </div>
</div>
```

切换时整张轨道上下移动。

```ts
const y = -activeIndex * root.clientHeight

if (firstSyncRef.current) {
  firstSyncRef.current = false
  gsap.set(track, { y })
  return
}

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  gsap.set(track, { y })
  return
}

gsap.to(track, { y, duration: CANVAS_SLIDE_DURATION, ease: CANVAS_SLIDE_EASE })
```

0.5s，power3.out，和抽屉同一组参数。

为什么用纵向画布，不用淡入淡出。翻页途中上下两页会同时出现在屏幕里，用户能看到页面之间的空间关系。淡入淡出会让页面像凭空替换，用户失去方向感。

每个页面自己承担滚动。页面常驻，切走再切回来，原来的滚动位置还在。

`inert` 和 `aria-hidden` 让非当前页不参与焦点和读屏。

### 8.2 每页独立的平滑滚动

每个画布页面挂一个 Lenis，只在指针精细的设备上创建。

```ts
const sections = [...root.querySelectorAll<HTMLElement>('section[data-canvas-page]')]
for (const section of sections) {
  attachSmoothScroll(section, { content: section.firstElementChild as HTMLElement | null })
}
```

参数接近 iPhone 的滚动手感。

```ts
export const smoothScrollOptions = {
  duration: 0.6,
  wheelMultiplier: 1.2,
  smoothWheel: true,
  syncTouch: false,
  touchMultiplier: 1,
  autoRaf: false,
  respectReducedMotion: true,
}
```

`autoRaf` 关掉。Lenis 默认每个实例常驻一个 rAF，移动端空闲时多个分页和详情页会每帧唤醒好几次。改成滚轮事件按需启动共享 ticker。

```ts
const tick = (time: number) => {
  tickerFrame = 0
  let running = false
  for (const lenis of active) {
    lenis.raf(time)
    if (lenis.isScrolling === 'smooth') running = true
  }
  if (running) tickerFrame = requestAnimationFrame(tick)
}
```

所有实例共用一个 ticker，只在平滑滚动期间运行。触摸滚动完全走原生，Lenis 不参与。

`syncTouch: false` 是关键。移动端的惯性必须交给系统，JS 模拟的惯性在真机上明显更卡。

### 8.3 嵌入模式的导航滑块

嵌入 Karin 时左侧是图标栏，选中背景是一枚黑色胶囊。

```tsx
<span
  ref={pillRef}
  aria-hidden='true'
  className='pointer-events-none absolute top-0 left-0 size-11 rounded-full bg-foreground'
/>
```

滑块位置用 GSAP 移动，时长和画布翻页一致。

```ts
gsap.to(pill, { y, duration: CANVAS_SLIDE_DURATION, ease: CANVAS_SLIDE_EASE })
```

图标颜色用 500ms 过渡，和翻页同拍。

```tsx
className='... [transition:color_500ms_var(--ease-quart-out),background-color_150ms_var(--ease-out)]'
```

背景色只在 hover 时 150ms 变化，颜色跟着 500ms 走。翻页时黑色胶囊滑到新图标下面，图标从灰变黑，两件事同时完成。

### 8.4 表单换机器人时的翻页

`BotsWorkspace` 在宽屏下保持顶栏不动，只让顶栏下面的表单内容翻页。

点击列表项时先给旧内容拍一张快照。

```ts
if (desktopMotion && body && pageHeight > 0) {
  const track = workspace.closest<HTMLElement>('.will-change-transform')
  const trackRect = track?.getBoundingClientRect() ?? null
  const frame = createSheetFrame(
    rect.left - (trackRect?.left ?? 0),
    rect.top - (trackRect?.top ?? 0) + bodyOffset,
    rect.width,
    pageHeight,
    11
  )
  const sheet = createFormSheet(panel)
  frame.appendChild(sheet)
  workspace.appendChild(frame)
  sheet.scrollTop = panel.scrollTop
  outgoingRef.current = { frame, sheet }
}
```

路由切到新机器人后，再给新内容拍一张同样大小的快照，两张快照在同一条时间线里首尾相接滑过。

```ts
timeline.fromTo(
  outgoing.sheet,
  { y: 0 },
  { y: direction * pageHeight, duration: SHEET_MOTION_DURATION, ease: SHEET_MOTION_EASE },
  0
)
timeline.fromTo(
  sheet,
  { y: -direction * pageHeight },
  { y: 0, duration: SHEET_MOTION_DURATION, ease: SHEET_MOTION_EASE },
  0
)
```

真实内容留在快照后面，动画结束时直接露出最终位置，不会出现新旧内容之间的空白带。

方向由列表索引决定。往下点，旧内容向上滑出，新内容从底部进入；往上点相反。

```ts
const up = fromIndex === -1 || toIndex === -1 ? true : toIndex > fromIndex
const direction = pending.up ? -1 : 1
```

快照固定在画布轨道上，不跟着面板的滚动区走。否则快照滑到工作区外面会把整页的 `scrollHeight` 撑大，出现多余的滚动条。

顶栏不参与翻页。`createFormSheet` 克隆面板时直接删掉顶栏。

```ts
sheet.querySelector<HTMLElement>('[data-form-header]')?.remove()
```

克隆节点不会复制输入框的实时值，需要手动同步。

```ts
const syncFormFields = (source: HTMLElement, target: HTMLElement) => {
  const sourceFields = source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  )
  const targetFields = target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  )
  targetFields.forEach((field, index) => {
    const sourceField = sourceFields[index]
    if (!sourceField) return
    if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
      if (sourceField instanceof HTMLInputElement) field.checked = sourceField.checked
      return
    }
    field.value = sourceField.value
  })
}
```

不同步的话，退场快照会闪回旧数据，用户会看到自己刚输入的内容消失一帧。

内容顶边要贴着屏幕边缘入场，顶栏占掉的高度不参与位移。

```ts
const measureBodyOffset = (panel: HTMLElement) => {
  const header = panel.querySelector<HTMLElement>('[data-form-header]')
  const body = panel.querySelector<HTMLElement>('[data-form-body]')
  if (!header || !body) return 0

  const form = body.closest('form')
  const gap = form ? Number.parseFloat(getComputedStyle(form).rowGap) || 0 : 0
  return header.getBoundingClientRect().height + gap
}
```

这里从顶栏高度和表单行间距算，不读表单主体的 `boundingRect`。快速连点时主体可能还带着上一段入场动画的位移，读 `rect` 会把快照放错位置。

窄屏没有固定顶栏，整块面板一起翻页。用 `createPanelClone` 复制整块面板，按方向滑出。

```ts
gsap.to(clone, {
  y: up ? -rect.height : rect.height,
  duration: SHEET_MOTION_DURATION,
  ease: SHEET_MOTION_EASE,
  onComplete: () => {
    clone.remove()
    if (cloneRef.current === clone) cloneRef.current = null
  },
})
```

翻页途中再次点击，直接撤掉旧快照，从当前画面重新开始。

```ts
const cancelPageTurn = useCallback(() => {
  pageTurnRef.current?.kill()
  pageTurnRef.current = null

  for (const snapshot of [outgoingRef.current, incomingRef.current]) {
    if (!snapshot) continue
    gsap.killTweensOf(snapshot.sheet)
    snapshot.frame.remove()
  }
  outgoingRef.current = null
  incomingRef.current = null
  ...
}, [])
```

### 8.5 列表选中块

桌面列表的选中底色是一块在行间滑动的浅色块，行本身保持透明。

```tsx
{selectedIndex >= 0 ? (
  <div
    aria-hidden='true'
    className={cn(
      'pointer-events-none absolute inset-x-0 top-0 h-14 rounded-xl bg-default',
      highlightReady &&
        'transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none'
    )}
    style={{ transform: `translateY(${selectedIndex * ROW_HEIGHT}px)` }}
  />
) : null}
```

行高固定 56px，选中块 56px，圆角 12px。200ms，`--ease-out`。

首帧不播滑动。刷新页面时选中块会从第一行滑到当前行，看起来像页面在自动操作。

```ts
useEffect(() => {
  let inner = 0
  const outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(() => setHighlightReady(true))
  })
  return () => {
    cancelAnimationFrame(outer)
    cancelAnimationFrame(inner)
  }
}, [])
```

等两帧再启用过渡，首次定位直接落位。

### 8.6 列表滚动位置

画布页面常驻，列表不会因为路由切换而卸载，滚动位置必须自己管理。

- 离开列表页时，等画布滑出屏幕后再复位到顶部。翻页期间列表还在屏幕上，立刻复位会被用户看到。
- 回到列表页时，把选中的机器人滚到列表可视区中间。
- 列表内部点击时，卡片本来就在视野里，不再触发定位。

```ts
if (!active) {
  const timer = window.setTimeout(() => setListScrollTop(0), CANVAS_SLIDE_DURATION * 1000)
  return () => window.clearTimeout(timer)
}

if (!selectedAppId) {
  setListScrollTop(0)
  return
}

if (pressedAppIdRef.current === selectedAppId) {
  pressedAppIdRef.current = null
  return
}

locateBot(selectedAppId)
```

`CANVAS_SLIDE_DURATION * 1000` 是 500ms，和画布翻页时长绑定。改翻页时长时这里会跟着改，不会出现列表提前跳回顶部。

---

## 9. 粒子转场

粒子系统有三个入口，共用同一套采样和画布管理。

| 入口 | 文件 | 用途 |
| --- | --- | --- |
| `morphText` | `lib/textParticles.ts` | 机器人名字变化时旧字散开、新字收拢 |
| `dissolveBox` | `lib/textParticles.ts` | “未保存”标签消失时散成粒子 |
| `dissolveBotCard` | `lib/dissolveBotCard.ts` | 删除机器人时整张卡片模糊消散 |

### 9.1 为什么用粒子

名字从“机器人 A”变成“机器人 B”是一个语义跳跃。直接替换文字会让顶栏像换了一个对象，用户需要重新确认自己在看谁。粒子把旧字拆成点阵再聚成新字，视觉上表达的是同一个位置上的内容发生了转化，整块界面没有被替换。

名字重组只在桌面端启用。

```ts
const desktop = isDesktopMotion()
if (desktop && !reduce && nameElement) {
  morphRef.current?.cancel()
  morphRef.current = morphText(previousName, nameElement)
}
```

`isDesktopMotion()` 的判断是 `(min-width: 80rem)`，和 Tailwind 的 `xl` 对齐。手机上顶栏空间小，名字变化频繁，粒子画布的开销和收益不成比例。

### 9.2 画布层

粒子画布铺在 `body` 上，`position: fixed`，`z-index: 100000`，`pointer-events: none`。

```ts
canvas.style.position = 'fixed'
canvas.style.left = `${left}px`
canvas.style.top = `${top}px`
canvas.style.width = `${width}px`
canvas.style.height = `${height}px`
canvas.style.zIndex = String(PARTICLE_Z_INDEX)
canvas.style.pointerEvents = 'none'
document.body.appendChild(canvas)
```

画布范围取新旧两个矩形的并集，再各边留出 48px。

```ts
const left = Math.min(...rects.map((rect) => rect.left)) - margin
const top = Math.min(...rects.map((rect) => rect.top)) - margin
const right = Math.max(...rects.map((rect) => rect.left + rect.width)) + margin
const bottom = Math.max(...rects.map((rect) => rect.top + rect.height)) + margin
```

画布必须挂在 body 上。名字在抽屉或表单顶栏里，祖先可能有 `overflow: hidden`、滚动容器、遮罩或 `backdrop-filter`。画在容器内部，粒子散开时会被裁掉。挂到 body 并抬高 z-index 以后，粒子可以盖住底部导航、列表和其他卡片。

DPR 上限 2。三倍屏上按 3 倍渲染，粒子数量会翻两倍多，收益只有边缘更细一点。

```ts
const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
```

### 9.3 采样

文字采样先在一个离屏画布上重绘文字，再按固定步长抽取像素。

```ts
const SAMPLE_STEP = 3
const MAX_PARTICLES = 2600

const collectParticles = (surface, offsetX, offsetY, alphaThreshold) => {
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data
  const step = Math.max(1, Math.round(SAMPLE_STEP * dpr))
  const size = SAMPLE_STEP * 0.82
  const particles = []

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const index = (y * canvas.width + x) * 4
      const alpha = data[index + 3]
      if (alpha < alphaThreshold) continue

      const cssX = (x + step / 2) / dpr
      const cssY = (y + step / 2) / dpr
      if (cssX > width || cssY > height) continue

      const angle = Math.random() * Math.PI * 2
      const radius = 6 + Math.random() * 22
      particles.push({
        x: offsetX + cssX,
        y: offsetY + cssY,
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius,
        size,
        color: `rgb(${data[index]} ${data[index + 1]} ${data[index + 2]})`,
        alpha: alpha / 255,
      })

      if (particles.length >= MAX_PARTICLES) return particles
    }
  }

  return particles
}
```

几个参数的作用。

| 参数 | 值 | 说明 |
| --- | --- | --- |
| `SAMPLE_STEP` | 3px | 每 3px 取一个点，文字仍然能看出字形 |
| 粒子尺寸 | 2.46px | `3 * 0.82`，比采样步长略小，点之间留一点缝 |
| 最大粒子数 | 2600 | 防止超长名字生成过多粒子 |
| 文字透明度阈值 | 24 | 过滤抗锯齿边缘的淡像素 |
| 标签透明度阈值 | 16 | 标签有底色，阈值可以低一点 |
| 散开半径 | 6 到 28px | 随机，方向也是随机 |

旧文字重绘时加 1.1px 模糊。

```ts
if (blurred) context.filter = 'blur(1.1px)'
```

散开时边缘软一些，不会像硬切图块。

文字在行盒里垂直居中。用字体自身的上下沿算基线，和 DOM 里的位置对齐。

```ts
const metrics = context.measureText(snapshot.text)
const ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || snapshot.fontSize * 0.8
const descent = metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || snapshot.fontSize * 0.2
const baseline = Math.max(ascent, (height - ascent - descent) / 2 + ascent)
context.fillText(snapshot.text, 0, baseline)
```

不这样算，粒子云会和真实文字差几像素，交叉淡化时看得出来。

### 9.4 文字重组的时间线

```ts
timeline = gsap.timeline({ onUpdate: render, onComplete: cleanup })
timeline.to(state, { out: 1, duration: 0.32, ease: 'power2.out' }, 0)
timeline.to(state, { inn: 1, duration: 0.34, ease: 'power3.out' }, 0.1)
timeline.to(element, { opacity: restoredOpacity, duration: 0.2, ease: 'power2.out' }, 0.3)
timeline.to(layer.canvas, { opacity: 0, duration: 0.2, ease: 'power2.out' }, 0.3)
```

| 时间 | 事件 |
| --- | --- |
| 0s | 旧粒子开始散开，0.32s 内淡出 |
| 0.1s | 新粒子开始从散开位置收拢，0.34s |
| 0.3s | 新粒子接近最终位置，真实文字淡入，粒子画布同步淡出 |
| 0.5s | 全部结束，画布移除，文字 opacity 恢复 |

0.3s 时做交叉淡化是关键。粒子收拢到接近最终位置时，如果直接撤掉画布，最后一帧会从点阵硬切成清晰文字。真实文字和画布用同一段曲线、同一段时长做交叉，两者透明度之和始终是 1。

总时长 0.5s，和表单翻页一致。翻页和名字重组同时发生，节奏不会打架。

### 9.5 标签消散

“未保存”标签从 DOM 卸载时，按上一帧记录的盒子重建它的样子，再散成粒子。

```ts
tween = gsap.to(state, {
  progress: 1,
  duration: 0.42,
  ease: 'power2.out',
  onUpdate: render,
  onComplete: cleanup,
})
```

粒子除了向外散，还向上飘 4px。

```ts
const y = particle.y + particle.dy * state.progress - state.progress * 4
```

0.42s 比文字重组稍长。标签面积小，粒子数量少，时间太短用户来不及看清。

### 9.6 卡片消散

删除机器人时，整张卡片克隆一份，固定在原位置，朝右上角模糊淡出。

```ts
gsap.to(clone, {
  x: 56,
  y: -64,
  scale: 0.96,
  opacity: 0,
  filter: 'blur(10px)',
  duration: 0.62,
  ease: 'power2.in',
  overwrite: 'auto',
  onComplete: () => {
    clone.remove()
    resolve()
  },
})
```

动画对象用克隆节点，不用原卡片，因为原卡片可能被列表的 `overflow` 裁掉。克隆体 `position: fixed`，不受祖先裁切。原卡片先 `visibility: hidden`，保留布局，等删除成功后再由列表移除。

克隆体用内联 `transition: none` 覆盖原卡片的按压过渡，避免和 GSAP 抢 `transform` 和 `opacity`。

```ts
clone.style.cssText = [
  'position:fixed',
  `left:${rect.left}px`,
  `top:${rect.top}px`,
  `width:${rect.width}px`,
  `height:${rect.height}px`,
  'margin:0',
  'z-index:100001',
  'pointer-events:none',
  'transform-origin:50% 50%',
  'transition:none',
  `background:${getComputedStyle(card.parentElement ?? card).backgroundColor}`,
].join(';')
```

卡片可能已经滚出屏幕。先瞬移进视野再取位置。

```ts
card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
```

粒子的参数。

| 参数 | 值 |
| --- | --- |
| 粒子数量 | 面积除以 760，夹在 44 到 96 之间 |
| 发射角 | -45 度，上下随机偏移 1.15 弧度 |
| 速度 | 0.12 到 0.42 px/ms |
| 尺寸 | 0.7 到 2.9px |
| 寿命 | 520 到 940ms |
| 上浮 | 12px，按 `1 - (1 - p)^3` 缓出 |
| 透明度 | 0.3 到 0.75 |
| 颜色 | 前景色、前景色、弱化色、状态色 |

颜色数组里前景色出现两次，让大部分粒子保持中性，少数粒子带状态色。这样既能看出是哪个机器人，又不会变成彩色烟花。

失败时恢复卡片。

```ts
const restore = () => {
  gsap.killTweensOf(clone)
  clone.remove()
  card.style.visibility = previousVisibility
  particles.stop()
}
```

### 9.7 与抽屉退场的编排

手机端移除机器人的顺序是，确认框退场，抽屉沿原路滑回，列表卡片模糊消散，配置删除，粒子播完，Toast 出现。

```ts
const handleSheetExited = useCallback(() => {
  const pending = pendingRemoveRef.current
  if (!pending) return
  pendingRemoveRef.current = null

  const dissolve = dissolveBotCard(pending.appId, pending.color)

  void (async () => {
    if (dissolve) await dissolve.cardDone

    try {
      await remove(pending.appId)
      if (dissolve) await dissolve.particlesDone
      toast.success('机器人已移除', { description: `${pending.name} 已从配置中删除` })
    } catch {
      dissolve?.restore()
    } finally {
      setRemoving(false)
    }
  })()
}, [remove])
```

先等 `cardDone` 再删配置，卡片不会在动画中途消失。再等 `particlesDone` 再弹 Toast，提示不会盖在粒子上。

确认后不立刻关抽屉，等 140ms 让确认框先退场。

```ts
window.setTimeout(() => close(), reduceMotion ? 0 : 140)
```

确认框和抽屉同时动，两层动画会互相干扰。等确认框的退场动画先跑一段，抽屉再开始滑回，视觉上更干净。

---

## 10. 状态、保存与按压反馈

### 10.1 状态圆点

```ts
export const STATUS_DOT_CLASS =
  'size-2 shrink-0 rounded-full border border-current data-[online=true]:bg-current data-[online=true]:shadow-[0_0_0_3px_color-mix(in_oklab,currentColor_16%,transparent)] data-[offline=true]:bg-[color-mix(in_oklab,currentColor_32%,transparent)]'
```

在线是实心加一圈 16% 的光晕，离线是 32% 的半透明填充，停用只留边框。形状和填充一起表达状态，不只靠颜色。

状态真正变化时圆点轻弹一下。

```css
@keyframes status-dot-pulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.18); }
  100% { transform: scale(1); }
}
```

```tsx
pulse && 'animate-[status-dot-pulse_200ms_var(--ease-out)] motion-reduce:animate-none'
```

200ms，只放大到 1.18。这是状态切换的落点，没有装饰意味。

### 10.2 状态组交叉淡化

`StatusCrossfade` 在状态变化时把新旧两枚状态叠在一起。

```ts
timeline.fromTo(
  current,
  { autoAlpha: 0, y: reduce ? 0 : 2 },
  { autoAlpha: 1, y: 0, duration: reduce ? 0.12 : 0.18, ease: 'power2.out', clearProps: 'opacity,visibility,transform' },
  0
)
timeline.to(outgoing, { autoAlpha: 0, y: reduce ? 0 : -2, duration: reduce ? 0.12 : 0.16, ease: 'power2.out' }, 0)
timeline.to({}, { duration: reduce ? 0 : 0.06 })
```

新状态从下方 2px 淡入，旧状态向上 2px 淡出。最后停 60ms，让圆点脉冲播完再卸载旧状态。

新旧文字如果直接交换，会有一帧重叠或空白。交叉淡化把这一帧处理掉，用户看到的是同一个位置上的状态在更新。

### 10.3 保存提示

保存提示 portal 到 body，固定在顶部，避开安全区。

```tsx
<div
  className='pointer-events-none fixed inset-x-0 z-[100001] flex justify-center'
  style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
>
```

胶囊用 20px 背景模糊加 1.4 饱和度。

```tsx
className='flex items-center gap-2 rounded-full border border-border/80 bg-background/78 px-4 py-2 text-sm shadow-lg backdrop-blur-[20px] backdrop-saturate-[1.4] ...'
```

三种进入方式。

```ts
if (state === 'idle') {
  gsap.to(element, {
    autoAlpha: 0,
    y: reduceMotion ? 0 : -10,
    duration: reduceMotion ? 0.12 : 0.18,
    ease: 'power2.in',
    overwrite: 'auto',
  })
  return
}

if (wasIdle) {
  gsap.fromTo(
    element,
    { autoAlpha: 0, y: reduceMotion ? 0 : -14 },
    {
      autoAlpha: 1,
      y: 0,
      duration: reduceMotion ? 0.12 : 0.28,
      ease: reduceMotion ? 'power2.out' : 'back.out(1.35)',
      overwrite: 'auto',
    }
  )
  return
}

gsap.fromTo(
  element,
  { autoAlpha: 0.55 },
  { autoAlpha: 1, duration: reduceMotion ? 0.1 : 0.16, ease: 'power2.out', overwrite: 'auto' }
)
```

第一次出现时从顶部 -14px 弹入，`back.out(1.35)` 给一点轻微回弹。保存中切到已保存只做 0.16s 的淡入，不再从顶部弹一次。

这个区别很重要。保存过程中提示一直挂在屏幕上，文字从“保存中”变成“已保存”，如果每次都重新播一遍弹入，用户会看到同一个提示反复跳。只有从无到有的第一次出现值得回弹。

保存状态持续 1600ms 后自动消失，错误状态 3200ms。

```ts
showSaveState('saved', 1600)
...
showSaveState('error', 3200)
```

错误需要更长的阅读时间。

### 10.4 高度过渡

`AnimatedHeight` 在内容变多或变少时让外层跟着长高或缩短。

```ts
gsap.fromTo(
  outer,
  { height: outer.getBoundingClientRect().height },
  {
    height: next,
    duration: UI_MOTION_DURATION,
    ease: UI_MOTION_EASE,
    onComplete: () => outer.classList.remove('overflow-hidden'),
  }
)
```

`ResizeObserver` 只观察内层。外层高度由 GSAP 写成内联值，内层保持自然高度，动画过程中不会自己触发自己。

只有动画进行中才加 `overflow-hidden`。平时不加，避免把按钮的焦点环切掉。

高度归零或从零恢复通常是面板被隐藏或显示，属于可见性切换，不做展开动画，直接落位。

### 10.5 按压反馈

手机端所有可按压行共用一条类名。

```ts
export const PRESSABLE_CLASS =
  'transition-[scale,opacity] duration-[120ms] ease-[var(--ease-out)] active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100'
```

120ms，缩放到 0.985。0.985 很小，手指按下时能感觉到反馈，但不会让整行明显缩小。0.95 那种幅度适合独立按钮，不适合列表行。

减少动态效果时去掉缩放，保留颜色变化。

### 10.6 表单顶栏的 FLIP

名字长度变化时，右侧状态和“未保存”标签要跟着平移，不能瞬移。

```ts
if (statusElement && previous.statusRect && next.statusRect) {
  const deltaX = previous.statusRect.left - next.statusRect.left
  if (!reduce && Math.abs(deltaX) > 0.5) {
    statusFlipRef.current?.kill()
    statusFlipRef.current = gsap.fromTo(
      statusElement,
      { x: deltaX },
      { x: 0, duration: STATUS_FLIP_DURATION, ease: UI_MOTION_EASE, clearProps: 'transform', overwrite: 'auto' }
    )
  }
}
```

先读旧位置和新位置，算出差值，把元素瞬移到旧位置，再用 0.26s 滑回 0。这就是 FLIP。

标签消失时不用平移，用粒子消散。标签出现时用 CSS 的 `starting:` 变体做 160ms 的缩放淡入。

```tsx
className='... transition-[opacity,scale] duration-[160ms] ease-[var(--ease-out)] starting:scale-[0.96] starting:opacity-0 ...'
```

### 10.7 保存按钮

保存按钮的可用状态跟 `dirty` 绑定。

```tsx
<Button type='submit' form={formId} fullWidth isPending={saving} isDisabled={!dirty}>
  {({ isPending }) => (
    <>
      {isPending ? null : <Save className='size-4' aria-hidden='true' />}
      <span>{isPending ? '保存中' : '保存配置'}</span>
    </>
  )}
</Button>
```

没有改动时按钮不可用，用户不需要猜保存有没有生效。保存中图标消失，文字变成“保存中”，HeroUI 的 pending 状态同时给出进度反馈。

底部固定按钮用 `form` 属性提交表单。按钮在 `<form>` 外面，不依赖 DOM 嵌套。

---

## 11. 滚动驱动的返回按钮

详情页的返回按钮停留在顶部时是带文字的胶囊，内容向上滚动时连续收缩成圆形。

```tsx
<button
  ref={buttonRef}
  className='pointer-events-auto flex h-10 items-center justify-center overflow-hidden rounded-full border text-sm font-medium text-foreground [--back-p:0] w-[calc(2.5rem_+_(1_-_var(--back-p))_*_6.5rem)] px-[calc(0.5rem_+_(1_-_var(--back-p))_*_0.5rem)] border-[color-mix(in_oklab,var(--border)_calc(var(--back-p)*100%),transparent)] bg-[color-mix(in_oklab,var(--background)_calc(var(--back-p)*82%),transparent)] shadow-[0_calc(var(--back-p)*6px)_calc(var(--back-p)*18px)_rgb(0_0_0/calc(var(--back-p)*0.12))] backdrop-blur-[calc(var(--back-p)*18px)] [transition:background-color_100ms_linear,border-color_100ms_linear] ...'
>
  <ArrowLeft className='size-4 shrink-0' aria-hidden='true' />
  <span className='overflow-hidden whitespace-nowrap max-w-[calc((1_-_var(--back-p))_*_6rem)] ml-[calc((1_-_var(--back-p))_*_0.5rem)] opacity-[calc(1_-_var(--back-p))]'>
    机器人列表
  </span>
</button>
```

进度由滚动位置算。

```ts
const progress = reduceMotion
  ? (scroller.scrollTop > 8 ? 1 : 0)
  : Math.min(1, scroller.scrollTop / 44)
button.style.setProperty('--back-p', progress.toFixed(3))
```

44px 对应按钮从胶囊变成圆形所需的滚动距离。进度只写一个 CSS 变量，宽度、内边距、边框透明度、背景、阴影、模糊、文字宽度、文字透明度全部由它推导。

为什么用连续进度，不用阈值切换。阈值切换会在某个滚动位置突然从胶囊变成圆形，用户的视线正好在那个位置，会看到一次明显的跳变。连续变化让按钮随着内容移动慢慢收拢，注意力留在内容上。

背景和边框用 100ms 线性过渡补一点平滑。滚动本身已经提供进度，过渡只负责抹掉高频滚动的细小抖动。

减少动态效果时改成 8px 阈值，直接切换，不做连续收缩。

滚动监听用 rAF 合并，进度没变时跳过写入。

```ts
const schedule = () => {
  if (frameRef.current) return
  frameRef.current = requestAnimationFrame(update)
}
```

`progress === lastProgress` 时直接返回。滚过 44px 后进度一直是 1，每帧重复写自定义属性会白白触发样式重算。

---

## 12. 表单与输入法

### 12.1 手机端分组

手机端用 iOS 设置页式分组，不用桌面卡片。

```tsx
export const MobileGroup = ({ title, description, children, className, contentClassName }) => (
  <section className={cn('flex flex-col gap-2', className)}>
    {title ? <h2 className='px-1 text-[13px] font-medium text-muted'>{title}</h2> : null}
    <div className={cn('overflow-hidden rounded-2xl border border-border/60 bg-surface', contentClassName)}>
      {children}
    </div>
    {description ? <p className='px-1 text-[11px] leading-5 text-muted'>{description}</p> : null}
  </section>
)
```

小标题 13px，在组外。组内 16px 圆角，1px 边框。行与行之间用 `border-b border-border/50`，最后一行去掉。

行内边距 `px-4 py-3`，最小高度接近 48px。图标容器 32px，圆角 8px。

页面标题 26px，负字距 -0.03em，描述 12px。

### 12.2 输入框

AppID 和 AppSecret 都关闭自动填充和拼写检查。

```tsx
<Input
  autoComplete='off'
  spellCheck={false}
  placeholder='机器人 AppID'
  data-1p-ignore
  data-bwignore
  data-lpignore='true'
/>
```

这些属性分别对应 1Password、Bitwarden、LastPass。不关掉的话，密码管理器会在 AppID 输入框上弹保存密码提示。

AppSecret 用 `-webkit-text-security` 做遮罩，不用 `type="password"`。

```ts
const masked = !visible && supportsTextSecurity
const type = visible || supportsTextSecurity ? 'text' : 'password'
```

`type="password"` 会触发浏览器的密码保存流程。用 `text` 加 `-webkit-text-security: disc` 可以遮罩，又不会让浏览器把 AppSecret 当成登录密码。

不支持 `-webkit-text-security` 的浏览器退回 `type="password"`，并设置 `autoComplete='new-password'`。

### 12.3 校验

校验分两层。字段级错误显示在输入框下面，接口级错误显示在表单顶部的 Alert 里。

```ts
if (!appId) nextErrors.appId = '请填写 AppID'
else if (/\s/.test(appId)) nextErrors.appId = 'AppID 不能包含空格'
else if (otherAppIds.includes(appId)) nextErrors.appId = '这个 AppID 已经存在'

if (value.event.type !== 0 && !value.secret.trim()) {
  next.secret = '连接机器人需要 AppSecret，扫码授权会自动填写'
}
```

用户修改字段时立刻清掉该字段的错误。

```ts
onChange={(appId) => {
  patch({ appId })
  if (errors.appId) setErrors((current) => ({ ...current, appId: '' }))
}}
```

错误不会一直挂在输入框上，用户开始修正时提示就让位。

### 12.4 未保存判断

草稿和原配置的深度比较忽略对象键顺序。

```ts
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
```

服务端会重新格式化配置，对象键顺序可能变化。直接 `JSON.stringify` 会在没有改动时也判定为 dirty。

### 12.5 输入法与滚动

这一节和第 4.10 是同一套机制在不同容器里的应用。

详情页和抽屉都不调用 `scrollIntoView`。焦点输入框的露出只写自己的滚动容器。

```ts
const revealActiveInput = () => {
  const focused = document.activeElement
  if (!content || !(focused instanceof HTMLElement) || !scroller.contains(focused)) return
  ...
  setScrollTop(scroller.scrollTop + delta)
}
```

`scrollIntoView` 会连带滚动页面。iOS 上表现为整个页面被顶上去，输入法上面变成页面底部。

`visualViewport` 的 `offsetTop` 和 `height` 用来算真正的可见区。布局视口在 iOS 上不会因为键盘变化，只看 `innerHeight` 会算错。

### 12.6 安全区

抽屉底栏和详情页底栏都留出底部安全区。

```tsx
<footer className='... pb-[max(0.75rem,env(safe-area-inset-bottom))]'>
```

顶栏在全屏时留出顶部安全区，半屏时不加。判断逻辑在 `syncSheetChrome`。

手机底部导航同样留安全区。

```tsx
<nav className='... pb-[max(0.375rem,env(safe-area-inset-bottom))]'>
```

---

## 13. 可访问性与降级

### 13.1 焦点

全局焦点环 2px。

```css
:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
```

只在键盘导航时出现，鼠标点击不显示。

详情页作为模态覆盖层，挂载后主动聚焦。

```ts
useEffect(() => {
  rootRef.current?.focus()
}, [])
```

```tsx
<div ref={rootRef} role='dialog' aria-modal='true' aria-label='机器人配置' tabIndex={-1} ...>
```

### 13.2 非当前页隔离

画布和分页器里非当前页同时挂载，用 `inert` 和 `aria-hidden` 隔离。

```tsx
aria-hidden={index !== activeIndex}
inert={index !== activeIndex}
```

`inert` 让非当前页不能聚焦、不能点击，也读屏不可见。只设 `aria-hidden` 不够，键盘仍然能 Tab 进去。

### 13.3 状态播报

保存提示用 `role="status"` 和 `aria-live="polite"`。

```tsx
<div ref={ref} role='status' aria-live='polite' ...>
```

状态变化会被读屏播报，不需要用户主动查看。

状态圆点本身 `aria-hidden`，文字标签负责表达状态。颜色之外还有文字标签。

图标按钮都有 `aria-label`。

```tsx
<Button isIconOnly size='sm' variant='tertiary' aria-label='关闭机器人配置' onPress={onRequestClose}>
  <X className='size-4' aria-hidden='true' />
</Button>
```

### 13.4 触摸目标

所有可点击区域至少 44px 高。

| 元素 | 高度 |
| --- | --- |
| 底部导航项 | `min-h-11`，44px |
| 列表行 | 56px |
| 手机分组行 | 约 48px |
| 分段标签 | 36px，外层容器加内边距后 44px |
| 抽屉关闭按钮 | 32px 视觉，热区由 Button 保证 |
| 详情页返回按钮 | 40px |

视觉尺寸可以小于 44px，热区不能。

### 13.5 键盘操作

嵌入模式的图标导航自己处理 Enter 和 Space。

```tsx
onKeyDown={(event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  navigate(item.to)
}}
```

链接本身 `tabIndex={-1}`，焦点由 Tooltip.Trigger 承担，避免一次导航出现两个焦点。

### 13.6 主题

主题和 Karin 主 WebUI 共用 `system` 和 `inverse` 两种偏好。

```ts
const resolveTheme = (theme: StoredTheme): AppliedTheme => {
  const dark = prefersDark()
  if (theme === 'system') return dark ? 'dark' : 'light'
  return dark ? 'light' : 'dark'
}
```

`index.html` 里有一段同步脚本，在 React 挂载前把主题类名写到 `<html>` 上，避免首屏闪白。

```html
<script>
  ;(() => {
    const fallback = 'system'
    let stored = fallback
    try {
      const raw = localStorage.getItem('theme')
      if (raw === 'system' || raw === 'inverse') {
        stored = raw
      } else if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed === 'system' || parsed === 'inverse') stored = parsed
      }
    } catch {
      stored = fallback
    }

    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const applied = stored === 'inverse' ? (dark ? 'light' : 'dark') : dark ? 'dark' : 'light'
    document.documentElement.classList.add(applied)
    document.documentElement.dataset.theme = applied
  })()
</script>
```

`<meta name="color-scheme" content="light dark" />` 和两条 `theme-color` 让浏览器状态栏跟着主题变色。

---

## 14. 性能守则

### 14.1 只动 transform 和 opacity

抽屉、分页、吸附、惯性、状态淡入淡出全部只写 `transform` 和 `opacity`。这两个属性跳过布局和绘制，由合成器逐帧插值。

唯一动 `height` 的地方是 `AnimatedHeight` 和桌面页头收起。高度没有合成器替代方案，使用范围被限制在很小的区域，且不在手势期间运行。

### 14.2 不逐帧读布局

抽屉拖动只在手势开始时量一次可见高度。

```ts
let measured = false
let visibleHeight = 0

const measureVisible = () => {
  if (!measured) {
    measured = true
    const y = readTranslate(dialog)
    lastY = y
    visibleHeight = base() - y
  }
  return visibleHeight
}
```

横向分页只在锁定横向轴时量一次页宽。

```ts
dragWidth = root.clientWidth
```

读取 `getBoundingClientRect` 或 `clientWidth` 会强制同步重排。每帧读一次，主线程很容易超预算。

### 14.3 每帧最多写一次

触摸事件先存进 pending，用 rAF 合并。`touchend` 时同步冲刷最后一帧。

```ts
const scheduleDrag = (clientY: number) => {
  pendingY = clientY
  if (frameId) return
  frameId = requestAnimationFrame(applyPending)
}
```

120Hz 屏幕上 `touchmove` 可能每 4ms 一次，直接写会让一帧内写多次。

### 14.4 松手后的动画交给合成器

抽屉吸附、内容惯性、横向分页、标签滑入、详情页进出场都用 WAAPI。GSAP 只保留在粒子、FLIP 和高度过渡。

原因在 2.2 已经说过。补一个对比。GSAP 的 rAF 回调在主线程运行，路由提交、React 渲染、inert 切换都会阻塞它。WAAPI 的 `transform` 动画由合成器驱动，主线程掉帧不影响动画本身。

### 14.5 will-change 只加在会动的元素上

| 元素 | will-change |
| --- | --- |
| 抽屉 dialog | `transform` |
| 分页轨道 | `transform` |
| 画布轨道 | `transform` |
| 惯性内容层 | 动画期间临时加 `transform`，结束移除 |
| 手机外壳 | `transform` |

不给 `*` 加，也不给不动的容器加。每个提升的图层都占 GPU 内存。

### 14.6 不中途切换 backdrop-filter

`EdgeBlur` 的三层模糊全程保持 `display: block`。拖动、吸附、进出场都不切。

中途切 `display` 会销毁再重建合成层，安卓上会闪一帧。而且抽屉平移时模糊层和内容相对静止，重新采样没有意义。

### 14.7 Lenis 按需运行

`autoRaf` 关掉，所有实例共用一个 ticker，只在滚轮平滑滚动期间运行。没有精细指针的设备上不创建 Lenis。

```ts
const hasFinePointer = () => window.matchMedia('(any-pointer: fine)').matches
if (!hasFinePointer()) return
```

移动端的惯性交给系统。JS 模拟的惯性在真机上明显更卡。

### 14.8 事件监听按需 passive

只有需要 `preventDefault` 的 `touchmove` 和 `pointermove` 用 `passive: false`。`touchstart`、`wheel`、`scroll` 用 passive。

```ts
dialog.addEventListener('touchstart', onTouchStart, { passive: true })
dialog.addEventListener('touchmove', onTouchMove, { passive: false })
dialog.addEventListener('touchend', onTouchEnd, { passive: false })
```

`touchend` 用非 passive 是因为拖动结束后要 `preventDefault`，阻止补发 click。

### 14.9 克隆快照，不动真实复杂树

桌面表单翻页给旧内容拍快照，动画的是克隆节点。真实内容留在原位，动画结束直接露出。

克隆的代价是一次 `cloneNode` 和一次字段值同步，比每帧对整棵表单树做布局便宜得多。

### 14.10 画布上限

粒子画布 DPR 上限 2，粒子数上限 2600，卡片粒子数上限 96。超出部分直接丢弃。

```ts
const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
...
if (particles.length >= MAX_PARTICLES) return particles
```

粒子是装饰，数量到一定程度后视觉收益递减，成本线性上升。

### 14.11 清理

每个动画和监听都有对应的清理。

- WAAPI 动画在 `onfinish` 里 `cancel()`，组件卸载时取消。
- GSAP tween 在 effect 清理时 `kill()`。
- `ResizeObserver` 在清理时 `disconnect()`。
- 定时器在清理时 `clearTimeout()`。
- 粒子画布在完成或取消时 `remove()`。
- 克隆快照在动画完成或取消时 `remove()`。
- Lenis 实例在卸载时 `destroy()`。

---

## 15. 组件与布局规格

### 15.1 手机外壳

```tsx
<div className='mobile-frame relative flex h-dvh origin-top flex-col overflow-hidden bg-background will-change-transform' inert={isDetail}>
  <div className='min-h-0 flex-1'>
    <MobilePager ... />
  </div>
  <div className='pointer-events-none absolute inset-x-0 bottom-0 z-40'>
    <EdgeBlur edge='bottom' tone='surface' className='z-0' />
    <nav className='pointer-events-auto relative z-10 px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]'>
      ...
    </nav>
  </div>
</div>
```

用 `h-dvh`，不用 `h-screen`。移动端浏览器地址栏会改变 `100vh` 的实际高度，`dvh` 跟着可见区域走。

底部导航两列等宽，每项 `min-h-11`。图标容器 24px 高、最小 40px 宽，选中时背景变 `bg-default`，圆角全圆。

分页页面的内边距。

```tsx
className='... px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[calc(4rem+env(safe-area-inset-bottom,0px))]'
```

底部留 4rem，给导航和模糊层让位。

### 15.2 桌面外壳

独立打开时侧边栏 15.5rem，嵌入时 4.5rem。

| 布局 | 宽度 |
| --- | --- |
| 独立侧边栏 | `15.5rem` |
| 嵌入图标栏 | `4.5rem` |
| 画布最大宽度 | `78rem` |
| 工作区左列 | `20rem` |
| 工作区右列 | `minmax(0, 1fr)` |
| 顶栏高度 | `84px`（`h-21`） |

工作区两列各自滚动。

```tsx
className='relative grid items-start gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[20rem_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:items-stretch'
```

左列列表占满高度，标题固定在列顶，卡片在列表内部滚。右列表单自己是一个滚动容器。整页不再滚动。

### 15.3 抽屉内部

| 部位 | 内边距 |
| --- | --- |
| 顶栏 | `px-5 pt-2 pb-3` |
| 顶栏全屏 | 额外 `padding-top: max(0.5rem, env(safe-area-inset-top))` |
| 内容区 | `px-4` |
| 底栏 | `px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]` |
| 拖动手柄 | `mb-1`，由 `Drawer.Handle` 提供 |

顶栏和底栏都加 `touch-none`，避免浏览器把它们当成滚动区域。

### 15.4 层级

| 层级 | z-index | 元素 |
| --- | --- | --- |
| 抽屉内容 | 0 到 30 | 滚动区、模糊、顶栏、底栏 |
| 手机底部导航 | 40 | 导航和模糊 |
| 详情页 | 60 | 整页覆盖 |
| 粒子画布 | 100000 | 文字和标签粒子 |
| 保存提示 | 100001 | 顶部胶囊 |
| 卡片消散克隆 | 100001 | 删除动画 |
| 卡片粒子 | 100002 | 删除粒子 |
| 确认框 | 100010 | AlertDialog |

### 15.5 断点

| 断点 | 值 | 用途 |
| --- | --- | --- |
| 手机分叉 | 900px | React 切换 MobileShell |
| 桌面动效 | 80rem | 粒子、固定顶栏、双列表单 |
| 短屏 | 700px | 登录页压缩、二维码缩小 |
| 窄屏 | 380px | 二维码和状态改上下排列 |

---

## 16. 复刻清单

按顺序做，前一步不稳不要进下一步。

### 16.1 基础

1. 建立黑白灰主题变量，亮暗各一套。
2. 字体用系统字体栈，标题负字距，数字加 `tabular-nums`。
3. 卡片和抽屉全部 `shadow-none`，用 1px 边框分隔。
4. 全局 `-webkit-tap-highlight-color: transparent`，按钮 `touch-action: manipulation`。
5. 触摸设备输入框字号 16px。

### 16.2 动效骨架

1. 定义 0.5s power3.out 和对应 CSS 曲线。
2. 写 `animateProgress`，把曲线采样成 60 个关键帧。
3. 写 `readTranslate` 和 `readScale`。
4. 所有可打断动画按读、停、写、再启动的顺序实现。
5. 所有进场动画等两帧再启动。
6. 所有动效检查 `prefers-reduced-motion`。

### 16.3 抽屉

1. 固定像素高度，`translate3d` 控制可见高度。
2. 底栏反向平移，25% 以下跟着滑出。
3. 压暗层独立，只动 opacity。
4. 进出场 0.5s，外壳缩放 0.94、下移 10px。
5. 拖动只写 transform，每帧最多一次。
6. 到顶后交接给 `scrollTop`，松手交给 WAAPI 惯性。
7. 内容回顶后接管成高度拖动。
8. 键盘弹出时跟着 `drawer-content` 改 base 并铺满。
9. 顶栏底色和模糊层全程不切换。

### 16.4 边缘模糊

1. 三层模糊，高度 30/54/84，半径 8/3/1.25。
2. 遮罩 50%/42%/30%。
3. 不铺底色。
4. 不支持 `backdrop-filter` 时退回渐变底色。
5. 减少透明度时改实色。

### 16.5 分页与标签

1. 横向轨道，`touch-pan-y`，轴向锁定 1.2 倍。
2. 边缘阻尼 0.35。
3. 距离阈值页宽 20%，速度阈值 0.45 px/ms。
4. 吸附 0.32s，等两帧启动。
5. 标签支持按住拖选，按最近中心选中。
6. 抽屉内左右轻扫只滑入 24px。
7. 切标签不卸载扫码面板。

### 16.6 桌面

1. 纵向画布，页面常驻，0.5s 翻页。
2. 每页独立 Lenis，只给精细指针。
3. 表单换机器人用快照首尾相接。
4. 顶栏不参与翻页。
5. 列表选中块 200ms 滑动，首帧不播。

### 16.7 粒子与反馈

1. 粒子画布挂 body，z-index 100000。
2. 文字采样步长 3，上限 2600。
3. 旧字 0.32s 散开，新字 0.1s 开始收拢，0.3s 交叉淡化。
4. 标签消散 0.42s。
5. 卡片消散 0.62s，克隆节点 fixed 定位。
6. 保存提示首次出现才回弹。
7. 状态变化交叉淡化 0.18s，圆点脉冲 200ms。
8. 按压反馈 120ms，缩放 0.985。

### 16.8 常见错误

| 错误 | 后果 |
| --- | --- |
| 用 `height` 做抽屉动画 | 每帧重排整棵子树，手机上明显卡 |
| 拖动时每帧读 `getBoundingClientRect` | 强制同步布局，掉帧 |
| 用 `scrollIntoView` 露出输入框 | iOS 整个页面被顶上去 |
| 中途切换 `backdrop-filter` 的 `display` | 安卓闪一帧 |
| 用 `type="password"` 存 AppSecret | 浏览器弹保存密码提示 |
| 抽屉加 HeroUI 默认阴影 | 圆角上方出现灰黑渐变 |
| 横向手势用原生滚动 | Safari 嵌套滚动和鼠标拖动不可靠 |
| 松手后用 GSAP 跑吸附 | 路由提交时掉帧 |
| 粒子画在容器内部 | 被 `overflow` 或遮罩裁掉 |
| 拖动结束后不拦 click | 误触手指下面的按钮 |
| 用平均速度判断轻扫 | 手指停住再松开也会翻页 |
| 输入框字号小于 16px | iOS 自动放大页面，抽屉高度错乱 |

---

## 17. 验证方法

### 17.1 静态检查

在仓库根目录执行。

```bash
pnpm --filter @karinjs/adapter-qqbot-web typecheck
pnpm --filter @karinjs/adapter-qqbot-web lint
pnpm exec oxfmt --check packages/web/src
```

只格式化本次改动的文件，不要跑全仓库格式化。仓库开启了 `core.autocrlf`，全量格式化会把换行改一遍，留下大量假修改。

### 17.2 真机与模拟

用无头 Chrome 的 CDP 模拟 390×844、DPR 2、触摸开启，可以复现大部分手机行为。

```js
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
})
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
```

抽屉验证时依次做四件事。

1. 打开抽屉，停在半屏，记录 dialog 的 `boxShadow`、顶栏背景、模糊层数量和 `display`。
2. 把内容滚到顶栏下面，截图看文字是否被渐进模糊化开。
3. 从顶栏向上拖到中间，截图看拖动过程中模糊是否保持。
4. 继续拖过全屏顶点，触发内容滚动，记录交接前后的顶栏状态。

期望结果。

| 检查项 | 期望 |
| --- | --- |
| `boxShadow` | 全透明，没有 `0 18px 50px` |
| 顶栏背景 | `rgba(0, 0, 0, 0)` |
| 模糊层数量 | 6 层（顶部 3 层加底部 3 层） |
| 模糊层 `display` | 全部 `block` |
| 模糊半径 | `blur(8px)`、`blur(3px)`、`blur(1.25px)` |
| 全屏后 `touch-action` | `pan-y` |
| 交接前后 `scrollTop` | 连续增长，没有回跳 |

### 17.3 回归用例

项目里的探针脚本覆盖了这些场景，改动抽屉或手势后至少跑一遍。

- 快速连续打开关闭，检查落点是否越弹越矮。
- 进场途中点背景关闭，检查是否反向滑出。
- 退场途中重新打开，检查是否从当前位置滑回。
- 半屏拖到全屏后继续上拖，检查内容是否接着滚。
- 全屏滚到顶后继续下拉，检查是否接回收起。
- 全屏快速下扫，检查是否直接退场。
- 拖动后松手，检查是否误触手指下面的按钮。
- 键盘弹出后切换输入框，检查输入框是否停在底栏上面。
- 键盘收起，检查抽屉是否回到弹键盘前的高度。
- 减少动态效果模式下重复以上关键路径。

### 17.4 手感检查

代码能保证参数正确，保证不了手感。下面几项需要在真机上用慢放或逐帧看。

- 抽屉从半屏拖到全屏，交接点有没有一顿。
- 松手吸附的起速和手指离手速度是否接得上。
- 内容惯性结束写回 `scrollTop` 时有没有跳一帧。
- 键盘弹出时抽屉变高的过程有没有闪。
- 顶栏在滚动、拖动、交接三种状态下有没有颜色或模糊变化。
- 安卓设备上展开手势交接时头像和名字有没有闪。

手感问题的共同点是只出现一帧，截图看不出来，需要录屏或者用 DevTools 的 Performance 面板逐帧看。

---

## 附录 A 参数速查

### 动效

| 名称 | 值 |
| --- | --- |
| 主时长 | 0.5s |
| 主曲线 | power3.out / `cubic-bezier(0.165, 0.84, 0.44, 1)` |
| 快曲线 | `cubic-bezier(0.23, 1, 0.32, 1)` |
| WAAPI 采样 | 60 帧，惯性 120 帧 |
| 横向分页吸附 | 0.32s |
| 标签滑入 | 0.32s / 24px |
| 详情页进 / 出 | 0.32s / 0.24s |
| 状态交叉淡化 | 0.18s / 0.16s / 停 0.06s |
| 保存提示进 / 出 / 更新 | 0.28s / 0.18s / 0.16s |
| 按压反馈 | 120ms / 0.985 |
| 顶栏 FLIP | 0.26s |
| 列表选中块 | 200ms |
| 文字粒子 | 0.32s + 0.34s + 0.2s |
| 标签粒子 | 0.42s |
| 卡片消散 | 0.62s |

### 手势

| 名称 | 值 |
| --- | --- |
| 抽屉死区 | 6px |
| 分页死区 | 8px |
| 标签拖选死区 | 6px |
| 抽屉内轻扫死区 | 8px |
| 轴向比例 | 1.2 |
| 轻扫最小距离 | 24px |
| 轻扫速度阈值 | 0.45 px/ms |
| 速度过期 | 100ms |
| 采样间隔下限 | 4ms |
| 采样数量 | 8 |
| 点击抑制 | 200ms |
| 分页距离阈值 | 页宽 20% |
| 分页边缘阻尼 | 0.35 |
| 滚轮切页阈值 | 60 |
| 滚轮冷却 | 360ms |

### 抽屉

| 名称 | 值 |
| --- | --- |
| 默认高度 | 50% |
| 全屏阈值 | 75% |
| 退场阈值 | 25% |
| 底栏补偿上限 | 75% |
| 压暗 | 0.38 |
| 外壳缩放 | 0.94 |
| 外壳位移 | 10px |
| 顶部圆角 | 28px |
| 键盘阈值 | 100px |
| 惯性 τ | 480ms |
| 惯性速度范围 | 0.02 到 4 px/ms |
| 惯性关键帧 | 120 |

### 模糊

| 层 | 高度 | 半径 | 遮罩 |
| --- | --- | --- | --- |
| strong | 30px | 8px | 50% |
| medium | 54px | 3px | 42% |
| soft | 84px | 1.25px | 30% |
| 桌面列表标题 | 自适应 | 12px | 52% |
| 保存提示 | 自适应 | 20px | 无 |

### 颜色

| 令牌 | 亮色 | 暗色 |
| --- | --- | --- |
| background | `oklch(0.976 0 0)` | `oklch(0.145 0 0)` |
| foreground | `oklch(0.205 0 0)` | `oklch(0.95 0 0)` |
| surface | `oklch(1 0 0)` | `oklch(0.19 0 0)` |
| surface-secondary | `oklch(0.962 0 0)` | `oklch(0.225 0 0)` |
| muted | `oklch(0.505 0 0)` | `oklch(0.68 0 0)` |
| border | `oklch(0.9 0 0)` | `oklch(0.3 0 0)` |
| success | `oklch(0.56 0.16 150)` | `oklch(0.78 0.16 150)` |
| warning | `oklch(0.62 0.14 70)` | `oklch(0.82 0.15 80)` |
| danger | `oklch(0.55 0.2 25)` | `oklch(0.72 0.19 25)` |

---

## 附录 B 文件索引

| 关注点 | 文件 |
| --- | --- |
| 动效常量 | `src/lib/uiMotion.ts` |
| 抽屉常量 | `src/lib/sheetMotion.ts` |
| WAAPI 工具 | `src/lib/waapi.ts` |
| 轻扫判定 | `src/lib/flick.ts` |
| 抽屉外壳 | `src/components/mobile/MobileSheet.tsx` |
| 抽屉骨架 | `src/components/mobile/SheetScaffold.tsx` |
| 抽屉进出场 | `src/hooks/useSheetMotion.ts` |
| 抽屉拖动与键盘 | `src/hooks/useSheetDrag.ts` |
| 顶栏 chrome | `src/lib/sheetChrome.ts` |
| 边缘模糊 | `src/components/EdgeBlur.tsx` |
| 手机分页 | `src/components/mobile/MobilePager.tsx` |
| 分段标签 | `src/components/mobile/MobileSegmentedTabs.tsx` |
| 拖拽选择 | `src/hooks/useDragSelect.ts` |
| 桌面画布 | `src/components/desktop/CanvasPager.tsx` |
| 桌面工作区 | `src/pages/BotsWorkspace.tsx` |
| 文字粒子 | `src/lib/textParticles.ts` |
| 卡片消散 | `src/lib/dissolveBotCard.ts` |
| 状态组件 | `src/components/StatusPill.tsx` |
| 保存提示 | `src/components/SaveStatus.tsx` |
| 高度过渡 | `src/components/AnimatedHeight.tsx` |
| 返回按钮 | `src/components/mobile/MorphBackButton.tsx` |
| 按压类名 | `src/lib/uiClasses.ts` |
| 平滑滚动 | `src/lib/smoothScroll.ts` |
| 主题变量 | `src/styles.css` |
| 视口判定 | `src/hooks/useViewport.ts` |

---

这份文档描述的是当前实现，当前实现只是其中一种。参数可以按产品气质调整，规则背后的判断更值得保留。触控优先级、松手后的合成器动画、抽屉的固定高度模型、模糊层全程常开，这四条决定了整套界面摸起来像不像原生。先保住这四条，再谈视觉细节。
