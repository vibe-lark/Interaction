# Interaction（飞书 Docs Add-on）
用于在飞书文档内创建互动组件（投票 / 讨论 / 词云 / 排名等）的示例项目。

本项目基于「飞书云文档小组件（Docs Add-on）」开发，开发/调试/发布流程请参考：
https://open.larkoffice.com/document/client-docs/docs-add-on/03-cloud-document-widget-quick-developme

## 什么时候需要 clone 这个项目？
你可以在以下两种时机 clone：
- 你想基于本项目继续开发自己的 Docs Add-on（推荐直接 clone 本仓库作为起点）
- 你已经用官方 demo 验证过本机环境（opdev 登录、能打开测试页面），现在需要开始做真实功能开发

如果你还没安装/登录 opdev，建议先按下文“环境准备”完成一次 `opdev login`；但不必等到所有绑定都完成才 clone，本仓库可以先 clone 下来再去开放平台创建应用并补齐 `app.json`。

### 路线 A：直接 clone 本仓库（推荐）
适合：你已经确认要在此项目上做开发，愿意边绑平台边跑通环境。

1. clone 并安装依赖
```
git clone git@github.com:vibe-lark/Interaction.git
cd Interaction
npm install
```

2. 安装并登录 opdev
```
npm install @lark-opdev/cli@latest -g
opdev login
```

3. 在开放平台创建应用并开启 Docs Add-on，拿到 `appID / blockTypeID`，并复制系统提供的“测试页面/调试文档”链接

4. 生成本地 app.json（不提交 GitHub）
```
cp app.example.json app.json
```
填好 `appID / blockTypeID / url`

5. 启动开发并在文档里插入小组件验证
```
npm run start
```
打开 `url` 对应的测试页面/调试文档，在插入菜单中插入小组件（名称通常是 `blockTypeID`）。

6. 需要发布时上传
```
npm run upload
```
然后去开放平台后台创建版本并提交发布申请。

### 路线 B：先用官方 demo 验证环境，再 clone 本仓库
适合：你担心本机环境/opdev/账号权限有坑，希望先用最小示例排障。

1. 创建并跑通官方 demo（只用于验环境）
```
opdev create demo
cd demo
npm install
opdev login
npm run start
```
确认：能打开系统提供的测试页面/调试文档，并能插入 demo 小组件。

2. 环境验证通过后，clone 本仓库并按路线 A 的第 1/3/4/5/6 步继续
（不要在 demo 上继续开发真实功能，后续迁移成本高）

## 目录结构
├── README.md
├── app.json  #开发者配置文件（本地使用，不建议提交到公开仓库）
├── app.example.json  #示例配置文件（可提交）
├── node_modules
├── package.json
├── src #源代码目录
├── tsconfig.json #ts配置
└── webpack.config.js #构建工具

## 环境准备
### Node.js
需要安装 Node.js（会自动包含 npm）。

### 飞书开发者工具（opdev）
全局安装/升级：
```
npm install @lark-opdev/cli@latest -g
opdev help
```

如果历史安装过旧的包名，建议先清理再安装，避免路径覆盖：
```
npm uninstall @bdeefe/opdev-cli -g
```

版本匹配提示（遇到运行时 get lark session 等异常时重点检查）：
- `opdev >= 3.3.0` 搭配 `@lark-opdev/block-docs-addon-webpack-utils >= 1.0.0`
- `opdev < 3.3.0` 搭配 `@lark-opdev/block-docs-addon-webpack-utils <= 0.0.5`

### 登录账号
```
opdev login
```
按提示在浏览器登录并选择开发环境（Feishu）。

## 绑定到飞书开放平台（首次使用必做）
这个仓库只提供代码，不会包含你的真实 `appID / blockTypeID / 文档 url`。因此任何人 clone 后，都需要先在开放平台创建/获取自己的绑定信息，再在本地生成 `app.json` 才能调试与上传。

### 1. 在开放平台创建应用并开启 Docs Add-on 能力
- 打开飞书开放平台控制台，创建一个应用
- 在应用内开启「云文档小组件（Docs Add-on）」能力
- 在控制台里获取（或创建后复制）以下信息：
  - `appID`（形如 `cli_xxx`）
  - `blockTypeID`（形如 `blk_xxx`）

### 2. 获取用于调试的文档链接（通常由开放平台自动生成）
- 在飞书开放平台的 Docs Add-on 相关页面里，会提供一个“测试页面/调试文档”的链接（用于插入并调试小组件），一般是系统自动生成的
- 你也可以替换成自己有权限的飞书文档 URL 用于调试，但不建议把公司内部真实文档链接提交到公开仓库

### 3. 生成本地 app.json（不提交 GitHub）
在项目根目录执行：
```
cp app.example.json app.json
```
然后编辑 `app.json`，至少填好：
- `appID`: 你的应用 ID
- `blockTypeID`: 你的 blockTypeID
- `url`: 你的调试文档 URL（推荐填写开放平台自动生成的测试文档链接）

## 快速开始（本地调试）
### 1. 安装依赖
```
npm install
```

### 2. 准备 app.json（本地配置，不提交 GitHub）
本项目运行与上传依赖 `app.json`（包含开发者应用信息等），建议仅在本地维护，不提交到公开仓库。

首次运行前，从示例配置拷贝一份本地配置并填写必要字段：
```
cp app.example.json app.json
```

字段说明（示例见 `app.example.json`）：
- `appID`：飞书开发者后台创建的应用 ID
- `blockTypeID`：组件/Block 的类型 ID
- `url`：用于绑定/调试的文档 URL（不建议使用公司内部真实链接提交到公开仓库）

### 3. 启动开发
```
npm run start
```

### 4. 在文档里插入并调试小组件
- 打开 `app.json` 中配置的 `url` 对应文档
- 在文档的插入菜单中选择插入小组件（本地小组件名称通常为 `blockTypeID`）
- 修改代码后开发服务器会热更新；如遇到 hooks 相关报错，建议刷新页面或重启 dev server

### 5. 构建
```
npm run build
```

## 上传与发布
### 上传（生成程序包并上传）
```
npm run upload
```

### 发布
- 进入飞书开发者后台，选择刚上传的程序包
- 完善小组件基础信息并保存
- 在“应用发布”中创建版本并提交发布申请
- 审核通过后即可线上生效

## 可选：国际化配置
小组件名称/介绍可以在开发者后台开启国际化配置后，为不同语言配置对应文案；应用内国际化可以结合你自己的技术方案实现。

## 安全与开源
- 不要提交敏感信息：`app.json`、`.env*`、`app.secret.json` 等均应在 `.gitignore` 中忽略
- 如果敏感信息曾经提交到 Git 历史：请先轮换/作废对应凭证，再清理追踪记录与历史

## 常见问题
### app.json 是否必须？
对本地运行/上传通常是必须的（用于标识 add-on/应用信息）。建议仓库只保留 `app.example.json`。

### 为什么 opdev / 调试报错（例如 get lark session）？
优先检查全局 opdev 版本与项目依赖版本是否匹配，并确认已完成 `opdev login`。

### clone 后为什么“无法绑定 / 无法插入小组件”？
通常是因为你还没有在开放平台创建应用/开启 Docs Add-on，或没有在本地生成正确的 `app.json`：
- 确认已完成 `opdev login`
- 确认 `app.json` 存在并填了正确的 `appID / blockTypeID / url`
- 确认 `url` 对应的文档你有权限打开，并在该文档内插入小组件

### 为什么我看不到 loading？
项目内已提供基础 loading/busy 样式与文案；如仍未显示，一般是流程未触发或样式被覆盖，可检查 `mode === 'loading'` 与 `busy.show` 逻辑。  
