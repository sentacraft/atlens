# Atlens — AGENTS.md

本文件是本仓库对所有 coding agent 的**项目级**规则，是唯一真源。
`CLAUDE.md` 是指向本文件的软链，供 Claude Code 读取。

个人工作流规则（分支纪律、commit / PR 习惯、plan 归档、MCP 选择、回答语言）属于**全局作用域**，
在用户的全局规则文件里，不在本文件内。

## 项目概述

**Atlens**（原 X-Glass）：富士卡口镜头对比工具。用户可浏览、筛选、并排对比富士原厂及第三方全品牌镜头。
以 X 卡口为主，G 卡口（中画幅 GF）正在收录中。
填补"富士专属 + 全品牌覆盖 + 交互式横向对比 + 中英双语"的市场空白。

## 技术栈

| 层次 | 选择 |
|------|------|
| 框架 | Next.js（App Router）+ TypeScript |
| 样式 | Tailwind CSS |
| 包管理 | **pnpm**（`packageManager: pnpm@10.14.0`） |
| 部署 | Cloudflare Workers via OpenNext（`@opennextjs/cloudflare`） |
| 数据 | JSON 文件，与代码同仓库（`src/data/lenses.json`、`src/data/lenses-gfx.json`） |
| i18n | next-intl，从第一行代码接入 |

## 包管理器：只用 pnpm

本仓库只有 `pnpm-lock.yaml`。**禁止使用 `npm` 或 `yarn`** —— 在 pnpm 仓库里跑 `npm install`
会依据不同的解析规则装出不一致的依赖树，并生成一个不该存在的 `package-lock.json`。

常用命令：

| 命令 | 用途 |
|------|------|
| `pnpm run dev` | 开发服务器 |
| `pnpm run lint` / `lint:fix` | ESLint 检查 / 自动修复 |
| `pnpm run typecheck` | `wrangler types` + `tsc --noEmit` |
| `pnpm run check` | lint + typecheck |
| `pnpm run test` | Vitest 单测 |
| `pnpm run test:e2e` | Playwright E2E |
| `pnpm run build` | 生产构建（含图标生成、镜头数据校验、静态路由检查） |
| `pnpm run preview` | 在**真实 workerd 运行时**上本地预览 |
| `pnpm run nuke` | 清理 Turbopack 缓存并重启 |

**提交前必须确保 `pnpm run lint` 通过。**

`pnpm run preview` 而非 `next start` 是唯一能复现线上行为的本地手段：本项目部署在 Cloudflare
workerd 上，有些回归只在 workerd 暴露（见 `package.json` 里 `//preview` / `//start` 两条注释）。
改动路由、渲染模式或 `next.config.ts` 后，合并前跑一次 preview。

## Next.js 版本注意

本项目使用最新版 Next.js，API 和文件结构可能与训练数据有差异。写代码前先查阅
`node_modules/next/dist/docs/`，注意 deprecation 警告。

## next-intl 路由说明

本项目的 next-intl middleware 文件名为 **`src/middleware.ts`**（不是 `proxy.ts`）。

> **背景**：next-intl 早期推荐 `src/proxy.ts`，但 Next.js 16 将 `proxy.ts` 保留为 Node.js-runtime
> 专用代理文件名，会强制将其构建为 nodejs runtime，导致要求 Edge runtime 的部署目标无法部署。
> 因此改回标准的 `middleware.ts`，并接受 Next.js 16 输出的 deprecation 警告。

路由配置见 `src/i18n/routing.ts`：locales 为 `["zh", "en"]`，`defaultLocale: "en"`。
访问根 URL（无 locale）时，middleware 会自动 redirect 到 `/en`。

## 数据结构

类型定义见 `src/lib/types.ts`，业务逻辑（筛选、排序、格式化、等效焦距计算）见 `src/lib/lens/`。

**新老代处理原则**：同焦段多代版本均独立收录，用 `generation` 字段区分。

## 数据规范

- **禁止直接修改 `src/data/lenses.json` 与 `src/data/lenses-gfx.json`**：这两个文件由独立的
  data pipeline 生成并写入，本仓库内不允许手动编辑。数据变更必须通过 pipeline 流程完成。
  该 pipeline 是独立的私有仓库，本地按惯例 checkout 在本仓库的**同级目录**。
- `src/data/collections.json` 是**手写**的，可以直接编辑。

## 架构原则

**逻辑与 UI 严格分离**，为未来 monorepo 扩展预留空间：
- 筛选函数、TypeScript 类型、镜头数据 → `src/lib/` 或未来 `packages/shared/`
- UI 组件只负责渲染，不内嵌业务逻辑

## 代码风格

项目使用 **ESLint** 统一代码风格（无 Prettier），配置见 `eslint.config.mjs`。

### 花括号样式（重要）

ESLint 配置了 `curly: ["error", "all"]`，要求所有 `if / else / for / while` 等控制流必须带花括号。
**但花括号必须多行** —— 禁止 `if (x) { stmt; }` 这种单行花括号，必须展开成：

```ts
if (x) {
  stmt;
}
```

这条约束 ESLint **不强制**（项目不引入 `@stylistic` plugin），靠 agent/reviewer 自觉。
修 `curly` 报错时，**永远用多行展开**，不要用最小 diff 的单行 `{ stmt; }` 包法。

### i18n 修改必须配对所有 locale

修改 `src/messages/*.json` 任意 key 的 value 时，**必须同时修改所有 locale**（`en.json` 与
`zh.json` 至少都要动）。i18n 漂移（一种语言改了、另一种没改）不会被 linter / typecheck / 测试
抓到，只能靠人眼审 diff —— 所以 agent 必须主动配对修改，并在改完后自查 diff 的两侧 key 数量
是否对齐。

## 注释规范

代码注释（inline、block、JSDoc）一律用**英文**。

**禁止"此地无银三百两"型注释。** 修 bug 时不要在源码里留下"原本这里有 X，因为 X 会导致 Y 所以
删了"的解释 —— 这种解释属于 PR description / commit message，不属于源码。

注释只应用于：
- 解释**那些看起来很奇怪但因历史原因必须这么写**的代码（"为什么这样写"）
- 标注**非显然的副作用 / 时序依赖 / 隐式契约**（"调用前提是 X"）
- 引用**外部文档或 spec**（"see RFC xxxx"）

不该出现的：
- 复述代码字面上在做什么
- 解释"我 *没* 写什么"以及"为什么不写"
- 把 bug 修复的根因写成长段散文留在源码里
- 在新建文件 / 新加 handler 时写"use cases"作文

`src/lib/types.ts` 里 `Lens` 的 JSDoc 是 data pipeline 的字段抽取规格，**不要精简**。

## 开发规范

- **UI Token 规范**：所有视觉设计语言（交互状态颜色、通用按钮样式、选中态等）必须在
  `src/config/ui-tokens.ts` 中集中定义并导出，组件通过导入 token 使用，**禁止各处自行内联重复
  的样式字符串**。新增交互样式时，先判断是否为可复用的设计语言 —— 若是，先写入 `ui-tokens.ts`
  再引用；若是一次性局部样式才允许内联。
- **PWA / 设备环境 inset 规范**：iOS 刘海、Home Bar、WCO 等偏移量统一通过 `src/app/theme.css`
  `:root` 的 `--safe-inset-*` / `--titlebar-height` 变量引用，禁止在组件里直接调用
  `env(safe-area-inset-*)`。新增相关偏移时同步在 `e2e/pwa-safe-area.spec.ts` 补测试。
- **Bug 修复必须带回归测试**：修 bug 时，先写一个 failing test 复现问题，再改代码让测试通过。
  测试放在与被测模块同级的 `__tests__/` 目录下。根据 bug 类型选择测试层级：
  - **纯逻辑 bug**（工具函数、数据转换、计算错误）→ Vitest 单测（如 `src/lib/__tests__/`）
  - **组件渲染 / hook 行为 bug**（条件渲染错误、hook 状态不对、props 处理异常）→ Vitest +
    `@testing-library/react` + jsdom（如 `src/hooks/__tests__/`、`src/components/<区域>/__tests__/`，
    文件顶部加 `// @vitest-environment jsdom`）
  - **布局 / 交互 / 浏览器 API bug**（fixed 定位、scroll、ResizeObserver、跨设备适配等）→
    Playwright E2E（`e2e/`）
  - **纯 CSS 样式 bug**（颜色、间距、字号等不涉及条件逻辑的）→ 不强制写测试，但修完必须
    screenshot 验证
  - 拿不准用哪层时，**优先选最轻量能覆盖的那层**（单测 > 组件测试 > E2E）
- **Design Lab 约定**：所有用于 demo、design exploration、UX 研究的页面与实验组件都必须放在
  `src/app/[locale]/design-lab/` 下，避免污染生产代码。该目录下的所有页面与实验组件，以及所有
  Test Hook 相关页面与组件，一律直接写死英文文案，不接入 `next-intl`，也不要把实验文案写入
  `en.json` / `zh.json`。

## 视觉测试规范

改完任何 UI feature 后，做 visual verification 时**必须同时覆盖 Desktop 和 Mobile 两端**。
Mobile 用 375px 宽度模拟（iPhone SE）。不得只截 Desktop 截图就声明测试通过。

## Worktree 环境

`SessionStart` 时（Claude Code）或手动运行 `scripts/worktree-setup.sh` 时，脚本会在 worktree 内
按需执行 `pnpm install`（仅在依赖未安装或 `package.json` 有变化时）。dev server 不会自动启动，
需要时手动运行 `pnpm run dev`。

`.env.local` 由 git 的 `post-checkout` 钩子自动从主 worktree 软链进新 worktree —— 全仓库共用
同一份环境变量，不要在 worktree 里单独建一份。
