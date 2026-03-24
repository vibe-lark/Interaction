# Interaction（飞书 Docs Add-on）

> **🤖 提示：推荐使用 Trae AI 快速启动**
> 提交使用 **Trae IDE**，你可以直接在对话框中发送 **“帮我按照 README 的说明把这个项目跑起来，我的飞书文档测试链接是：[你的文档链接]”**，Trae 将会自动为你完成所有环境配置、依赖安装和启动服务。

用于在飞书文档内创建互动组件（投票 / 讨论 / 词云 / 排名等）的示例项目。

本项目基于「飞书云文档小组件（Docs Add-on）」开发，详细开发与发布流程请参考 [官方开发指南](https://open.larkoffice.com/document/client-docs/docs-add-on/03-cloud-document-widget-quick-developme)。

## 环境准备

1. **Node.js**: 请确保已安装 Node.js（推荐 LTS 版本）。
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

## 快速开始（本地调试）

要让本项目跑起来并能插入小组件，需要先通过官方流程创建测试应用并获取 `app.json` 配置。

**1. 生成测试应用配置 (app.json)**
在本项目外通过官方 CLI 创建一个临时工程（选择 `docs-addon`），系统会自动创建测试应用并生成 `app.json`：
```bash
opdev create demo
```

**2. 获取本项目代码并配置 app.json**
```bash
git clone git@github.com:vibe-lark/Interaction.git
cd Interaction

# 将上一步生成的 app.json 拷贝到本项目根目录
cp ../demo/app.json ./app.json 
```
**【关键步骤】**：打开拷贝过来的 `app.json`，将其中的 `url` 字段修改为您**用于测试的真实飞书云文档链接**（例如：`https://bytedance.larkoffice.com/docx/xxxx`）。

*(注意：`app.json` 包含开发者的真实应用信息，仅限本地调试使用，请勿提交到代码仓库。可参考 `app.example.json` 了解字段含义。)*

**3. 安装依赖与启动**
```bash
npm install
npm run start
```

**4. 在飞书云文档中调试**
- 执行 `npm run start` 后，留意控制台输出的一行特殊链接：`[docverse-debug-url] URL: https://您的文档链接?blockitdebug=true&debugport=8080`。
- 复制并在浏览器中打开这个带有 `blockitdebug=true` 参数的链接进入云文档。
- 在文档空白处，唤出插入菜单（输入 `/`），搜索您的小组件名称（或 `blockTypeID`），将其插入文档。
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
- **为什么在文档里无法插入小组件？**
  1. 确认已完成 `opdev login`。
  2. 确认 `app.json` 存在，且 `appID`、`blockTypeID`、`url` 填写正确。
  3. 确认你对 `url` 对应的文档有编辑权限。
- **为什么看不到 loading 状态？**
  项目内已提供基础 loading 样式；如未显示，可检查 `mode === 'loading'` 与 `busy.show` 逻辑是否被覆盖。
- **关于安全与国际化**
  - **安全**：切勿将 `app.json`、`.env*` 等敏感文件提交。若已不慎提交，请先作废对应凭证并清理 Git 历史。
  - **国际化**：小组件名称与介绍可在开发者后台开启国际化配置；组件内部文案国际化需结合具体技术方案实现。
