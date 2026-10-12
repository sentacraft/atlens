# Ask Iris 交接文档

更新时间：2026-10-12

## 1. 当前主线与阶段划分

目前 Ask Iris 的登录与持久化迭代按三阶段推进：

### 阶段一：登录与持久化基础设施

状态：已完成并合并到 `main`。

已完成内容：

- Better Auth 登录基础设施，包括 Google OAuth 和邮箱验证码登录。
- APP DB 中的用户、账户、Session、验证码等认证数据表。
- Conversation、Message 的持久化模型和用户所有权校验。
- 已登录用户读取自己的 Conversation 和消息。
- Ask Iris 的 Trace、Feedback 继续放在 Ask Iris 内部数据库，不与用户可见的 Conversation 数据混用。

相关已合并 PR：

- Better Auth foundation：[#473](https://github.com/sentacraft/atlens/pull/473)
- Authenticated conversation persistence：[#486](https://github.com/sentacraft/atlens/pull/486)

### 阶段二：Ask Iris Conversation workspace

状态：实现已完成，当前等待合并。

已实现内容：

- Ask Iris 页面默认打开新聊天。
- 登录用户在 Ask Iris 页面左侧查看 Conversation 列表，并在同一页面切换历史聊天。
- 当前 Conversation 通过 URL query `?conversation=` 保持，可刷新和分享当前地址。
- 匿名聊天登录后导入当前 Conversation。
- Conversation 使用 Conversation ID，不再继续引入 Segment 概念。
- Ask Iris 页面与网站 Catalog 的全局卡口切换解耦。
- 当前第一版不重新读取旧 Feedback 状态。

当前阶段还需要完成：

- Review 并合并当前 PR。
- 合并后重新从 `origin/main` 建立干净 worktree。
- 在真实本地环境验证 Google 登录、邮箱验证码登录、匿名聊天登录后导入和历史 Conversation 切换。
- 确认远程 APP DB migration、生产配置和部署 smoke test 状态。

#### 阶段二的技术实现拆分

阶段二原本计划拆成四个技术 PR。当前实现没有按四个独立 PR 拆开，而是集中在当前阶段二分支和 PR #488 中；下面的拆分仍然是后续 agent 理解范围和验证遗漏的依据。

##### PR2-A：历史列表和恢复

目标：把 Ask Iris 从单栏临时状态变成可恢复的 Conversation workspace。

包括：

- 两栏布局和 Conversation 列表。
- 获取 Conversation 列表与详情。
- 点击列表项恢复消息。
- New chat。
- 使用 URL 保存当前 Conversation。
- loading、empty、error 状态。
- 移除内存 archived thread 作为主要历史机制。

当前状态：已在 `aae1a3e feat(askiris): add conversation history workspace` 中实现。

##### PR2-B：对话切换和状态安全

目标：保证 Conversation 切换不会被正在进行的请求或旧状态覆盖。

包括：

- 正在生成回复时禁止或确认切换。
- 切换 Conversation 时停止当前 stream。
- 防止旧请求覆盖新 Conversation。
- 切换后正确同步 `useChat` 的 messages。
- 新消息完成后更新列表顺序。
- 新建 Conversation 后正确更新 URL。

当前状态：主要逻辑已随阶段二 workspace 实现，合并前需要重点做竞态和刷新回归验证。

##### PR2-C：匿名聊天登录后的导入

目标：用户匿名聊天后登录时，立即把当前聊天保存到账户。

包括：

- 登录成功后保存当前匿名 Conversation。
- 创建 Conversation 记录。
- 批量保存完整 UI message list。
- 防止重复导入。
- 导入失败时保留当前页面内容并显示错误。
- 登录后将当前 Conversation 纳入历史列表。

当前状态：导入 endpoint 和前端触发逻辑已在阶段二实现；合并前需要验证登录成功、重复触发、失败保留和列表刷新。

##### PR2-D：响应式 UI 和交互细节

目标：让 Conversation workspace 在 desktop 和 mobile 上可用。

包括：

- 移动端 drawer。
- desktop/mobile 视觉验证。
- 会话标题截断和更新时间显示。
- 用户入口和当前 Conversation 状态。
- 键盘无障碍操作。
- 触摸交互。

当前状态：基础 UI 已随阶段二实现；合并前仍需完成 375px mobile 和 desktop 的人工验证。

阶段二明确不包含：读取旧 Feedback、恢复旧 Thumb Up/Thumb Down 状态、用户名编辑、器材配置、收藏镜头、分享器材配置、Conversation 搜索/重命名、自动生成标题，以及完整的 Agent 上下文推理和确认机制。

### 阶段三：统一 AI Assistant 与上下文/意图处理

状态：尚未开始实现，仍需先完成产品和 Agent 方案讨论。

计划讨论内容：

- Ask Iris 是否继续使用名称，或改为更宽泛的 AI Assistant 入口。
- 用户不再先选择 X/GFX 卡口，而是让 Agent 从问题中识别意图和上下文。
- 需要时由 Agent 询问用户确认镜头系统、相机系统或其他上下文。
- 设计系统 Prompt、意图识别层和选择系统/上下文的 Tool。
- 覆盖镜头推荐、镜头知识与参数查询、网站数据与准确性问题、用户反馈提交等不同意图。
- 重新设计 Ask Iris 顶部导航，避免与 Catalog 的全局卡口切换冲突。

按当前规划，整体共三阶段：阶段一已完成，阶段二正在收尾，阶段三尚未开始。因此当前阶段收尾后还剩一个主要阶段。

## 2. 当前 PR 与分支

当前 PR：[#488](https://github.com/sentacraft/atlens/pull/488)

- Title：`fix(auth): align local and Worker environment variables`
- Branch：`codex/askiris-phase-2`
- Base：`main`
- 状态：Open、非 Draft、Merge state 为 clean。
- CI：当前已通过 OpenNext/workerd smoke test、Lint/Typecheck/Build/Test、Playwright 和 Workers Builds。

注意：由于当前分支是在阶段二实现分支上继续提交，PR #488 不只包含认证环境修复，还包含阶段二 Conversation workspace 和 worktree 初始化配置。交接时不要把它理解成一个只改 `src/lib/auth.ts` 的小 PR。

当前分支最近的提交：

- `aae1a3e feat(askiris): add conversation history workspace`
- `6ed1356 chore(worktree): bootstrap local environment`
- `4c08f76 fix(auth): align local and Worker environment variables`

## 3. 当前遇到的问题与处理结果

用户在本地点击 Google 登录时遇到：

```text
POST /api/auth/sign-in/social 500
```

根因不是 Google OAuth 回调地址本身，而是本地和生产环境变量的读取路径不一致：

- `next dev` 会把 `.env.local` 加载到 `process.env`。
- OpenNext 的 `getCloudflareContext().env` 在本地开发时主要提供 Wrangler/Cloudflare bindings，不包含 `.env.local` 的值。
- `src/lib/auth.ts` 之前从 `getCloudflareContext().env` 读取 `BETTER_AUTH_SECRET`、Google OAuth credentials 和 `SITE_URL`，因此本地认证配置为空或错误。

当前修正：

- Better Auth 的 Secret、Google OAuth credentials、`SITE_URL` 等应用配置统一从 `process.env` 读取。
- D1、KV、Email、Analytics Engine 等 Cloudflare binding 继续从 `getCloudflareContext().env` 读取。
- `.env.example` 增加本地回调地址 `SITE_URL=http://localhost:3000`。
- 主 checkout 和当前 worktree 的 ignored `.env.local` 已配置本地随机 `BETTER_AUTH_SECRET`、Google OAuth credentials 和 localhost `SITE_URL`。
- 本地验证结果：`/api/auth/get-session` 返回 200，Google 登录接口返回带 localhost callback 的 Google OAuth authorization URL。

生产环境的 `BETTER_AUTH_SECRET`、Google OAuth credentials 不需要重新配置；本地 Secret 与生产 Secret 应保持不同。

## 4. Worktree 环境配置

仓库现在有仓库级 SessionStart hook：

- `.claude/settings.json`
- `scripts/worktree-setup.sh`

新 worktree 启动时，脚本会在主 checkout 存在 `.env.local` 且当前 worktree 没有该文件时复制一份，并设置为 `600` 权限；已有 worktree-specific `.env.local` 不会被覆盖。

`.env.local` 仍被 Git 忽略，Secret 不会进入 PR。这个方案复制的是本机 ignored 配置，不是从 Cloudflare 读取或同步生产 Secret。

## 5. 台账与相关记录

Ask Iris 迭代台账：

`/Users/ericzhang/Library/Mobile Documents/iCloud~md~obsidian/Documents/SentaForge/Geek & Creativity/Projects/Atlens/Engineering/AskIris · 迭代记录.md`

Ask Iris 任务看板：

`/Users/ericzhang/Library/Mobile Documents/iCloud~md~obsidian/Documents/SentaForge/Geek & Creativity/Projects/Atlens/Tasks/AskIris.md`

台账中已经记录：

- 阶段二 Conversation workspace 的完成项和 smoke test 待办。
- 使用用户消息、Iris 回复、Trace 和 Feedback 优化冷启动推荐 query 的待办。
- Analytics Engine 只用于聚合分析，具体问题和回答内容来自 D1 Trace、Conversation message 与 Feedback 记录。

## 6. 建议的下一步

1. Review 并合并 PR #488。
2. 合并后同步 `origin/main`，重新创建干净 worktree。
3. 完成本地和生产相关的登录/Conversation smoke test，并把结果写回台账。
4. 单独讨论阶段三的 Agent context、intent routing、Tool 和 UI 方案，再开始实现。
