# Interaction（飞书 Docs Add-on）

> **🤖 Trae AI 使用指南**
> 本项目完美支持使用 **Trae IDE** 进行全自动化构建与调试。
> **如果你是开发者**：无需手动敲击繁琐的终端命令，你只需将本 `README.md` 的内容（或 GitHub 链接）提供给 Trae，并附上你的测试参数，Trae 就能自主阅读并完成从拉取代码到启动调试的全套工作。
> 
> **参考提示词（发给 Trae）：**
> *"请阅读这篇项目文档，理解 Docs Add-on 的本地开发流程。请帮我全自动完成代码拉取、环境准备和配置。我用于测试的飞书文档链接是 [文档链接]。我的 appID 是 [appID]（如果没有请通过 opdev 自动创建），blockTypeID 是 [blockTypeID]。请直接帮我跑起来。"*

用于在飞书文档内创建互动组件（投票 / 讨论 / 词云 / 排名等）的示例项目。

本项目基于「飞书云文档小组件（Docs Add-on）」开发，详细开发与发布流程请参考 [官方开发指南](https://open.larkoffice.com/document/client-docs/docs-add-on/03-cloud-document-widget-quick-developme)。

## 环境准备

1. **Node.js**: 请确保已安装 Node.js（推荐 LTS 版本，建议 18/20）。
2. **飞书开发者工具 (opdev)**:
   ```bash
   npm install @lark-opdev/cli@latest -g
   ```
   *(注：如果曾安装过旧包名，请先执行 `npm uninstall @bdeefe/opdev-cli -g` 卸载)*
3. **登录开发者账号**:
   ```bash
   opdev login
   ```
   按提示在浏览器中登录，并选择开发环境（Feishu）。

> **💡 版本匹配提示**：全局 `opdev >= 3.3.0` 需搭配本项目中的 `@lark-opdev/block-docs-addon-webpack-utils >= 1.0.0`，否则运行时可能报错。
>
> **💡 本地调试提示**：本项目本地调试会依赖全局安装的 `opdev`（它包含部分内部依赖）。如果你发现 `npm run start` 没有打印 `[docverse-debug-url] URL:`，请先确认已全局安装并完成 `opdev login`。

---

## 快速开始（本地调试）

要让本项目跑起来并能插入小组件，核心是需要一个包含真实应用信息的 `app.json` 配置文件。请根据你的实际情况选择以下两种方式之一：

### 方式一：我已经有现成的小组件应用了（推荐）
如果你已经在飞书开发者后台创建过 Docs Add-on 应用，或者已经有可用的 `appID`：

1. **获取代码并创建配置**：
   ```bash
   git clone git@github.com:vibe-lark/Interaction.git
   cd Interaction
   cp app.example.json app.json
   ```
2. **填写关键信息**：打开刚复制出来的 `app.json`，将其中的 `appID` 和 `blockTypeID` 替换为你自己的真实信息；将 `url` 字段替换为你**用于测试的真实飞书云文档链接**（例如：`https://bytedance.larkoffice.com/docx/xxxx`）。

---

### 方式二：我还没有小组件应用，需要从零开始
如果你是第一次接触，可以利用官方 CLI 的 `create` 命令，它会**自动在飞书后台为你创建一个真实的测试应用**，并生成配套的 `app.json`。

1. **生成自动配置**：在本项目外通过官方 CLI 创建一个临时工程（选择 `docs-addon` 且同意自动创建新应用）：
   ```bash
   opdev create demo -a docs-addon
   ```
   *（执行成功后，终端会打印出类似 `https://open.feishu.cn/app/cli_...` 的控制台链接，你可以点击该链接去飞书后台查看刚自动创建好的小组件信息。）*
2. **获取代码并“借用”配置**：
   ```bash
   git clone git@github.com:vibe-lark/Interaction.git
   cd Interaction
   
   # 将刚才自动生成的 app.json 拷贝到本项目根目录
   cp ../demo/app.json ./app.json 
   ```
3. **填写测试链接**：打开拷贝过来的 `app.json`，将其中的 `url` 字段修改为您**用于测试的真实飞书云文档链接**。

---

### 启动开发

*(注意：`app.json` 包含开发者的真实应用信息，仅限本地调试使用，请勿提交到代码仓库。)*

**1. 安装依赖与启动**
```bash
npm install
npm run start
```

**2. 在飞书云文档中调试**
- 执行 `npm run start` 后，留意控制台输出的一行特殊链接：`[docverse-debug-url] URL: https://您的文档链接?blockitdebug=true&debugport=8080`。
- 复制并在浏览器中打开这个带有 `blockitdebug=true` 参数的链接进入云文档。
- 在文档空白处，唤出插入菜单（输入 `/`），优先搜索您的小组件名称将其插入文档（部分场景不支持用 `blockTypeID` 搜索）。
- 如果在带 `blockitdebug=true` 的页面里无法从 `/` 菜单插入，请先打开不带参数的普通文档链接插入一次，再回到调试链接刷新。
- 此时云文档里运行的即为您本地的实时代码。在 IDE 中修改代码并保存，文档中的小组件会自动热更新（如遇 hooks 报错可刷新页面）。

## 上传与发布

- **构建打包**：`npm run build`
- **上传版本**：`npm run upload`
- **发布上线**：进入飞书开发者后台，选择刚上传的程序包，完善基础信息后在“应用发布”中创建版本并提交审核。

## 目录结构

```text
├── README.md
├── app.json            # 开发者本地配置文件（自动被 .gitignore 忽略）
├── app.example.json    # 示例配置文件（可提交，用于参考字段）
├── src/                # 源代码目录
├── tsconfig.json       # TypeScript 配置
└── webpack.config.js   # 构建工具配置
```

## 常见问题 (FAQ)

- **为什么运行 / 调试时报错（如 `get lark session` 异常）？**
  优先检查全局 `opdev` 版本与项目依赖是否匹配，并确认是否已完成 `opdev login`。
- **为什么 `npm run start` 没有打印 `[docverse-debug-url] URL:`？**
  1. 确认已全局安装 `opdev` 且能在终端运行：`opdev login`。
  2. 确认 `app.json` 存在且字段完整（`appID` / `blockTypeID` / `url`）。
- **为什么在文档里无法插入小组件？**
  1. 确认已完成 `opdev login`。
  2. 确认 `app.json` 存在，且 `appID`、`blockTypeID`、`url` 填写正确。
  3. 确认你对 `url` 对应的文档有编辑权限。
- **为什么 `opdev` 报错 `EPERM ... ~/.mpdev-cli/logs/run.YYYY-MM-DD.log`？**
  尝试创建并预先生成当天日志文件（macOS 常见）：
  ```bash
  mkdir -p ~/.mpdev-cli/logs
  touch ~/.mpdev-cli/logs/run.$(date +%F).log
  ```
- **为什么看不到 loading 状态？**
  项目内已提供基础 loading 样式；如未显示，可检查 `mode === 'loading'` 与 `busy.show` 逻辑是否被覆盖。
- **关于安全与国际化**
  - **安全**：切勿将 `app.json`、`.env*` 等敏感文件提交。若已不慎提交，请先作废对应凭证并清理 Git 历史。
  - **国际化**：小组件名称与介绍可在开发者后台开启国际化配置；组件内部文案国际化需结合具体技术方案实现。
