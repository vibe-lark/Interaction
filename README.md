# Interaction（飞书 Docs Add-on）
用于在飞书文档内创建互动组件（投票 / 讨论 / 词云 / 排名等）的示例项目。

本项目基于「飞书云文档小组件（Docs Add-on）」开发，开发/调试/发布流程请参考：
https://open.larkoffice.com/document/client-docs/docs-add-on/03-cloud-document-widget-quick-developme

## 什么时候需要 clone 这个项目？
结论：你可以随时 clone 下来阅读/改代码；但要“跑起来并能插入小组件”，需要先在开放平台创建测试应用（官方流程通常会在创建工程时自动创建并生成 `app.json`）。

### 使用步骤：先按官方流程创建测试应用，再使用本仓库代码
适合：第一次接触 Docs Add-on，或你希望完全按官方链路走通调试/上传/发布。

1. 环境准备并登录（按下文“环境准备”执行 `opdev login`）
2. 创建官方示例工程（选择 `docs-addon`），系统会自动创建测试应用并生成 `app.json`
```
opdev create demo
```
3. clone 本仓库代码
```
git clone git@github.com:vibe-lark/Interaction.git
cd Interaction
```
4. 把上一步官方工程生成的 `app.json` 拷贝到本仓库根目录（仅本地使用，不提交 GitHub）
例如（假设 `demo/` 与 `Interaction/` 在同一父目录）：
```
cp ../demo/app.json ./app.json
```
5. 安装依赖并启动
```
npm install
npm run start
```
6. 打开 `app.json` 里的测试页面/调试文档链接，在文档里插入小组件验证（本地小组件名称通常是 `blockTypeID`）
7. 需要发布时上传并到后台创建版本发布
```
npm run upload
```

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

## 快速开始（本地调试）
### 1. 安装依赖
```
npm install
```

### 2. 准备 app.json（本地配置，不提交 GitHub）
本项目运行与上传依赖 `app.json`（包含开发者应用信息等），建议仅在本地维护，不提交到公开仓库。

建议按官方流程（`opdev create ...` 选择 `docs-addon`）先创建一个工程，让系统自动创建测试应用并生成 `app.json`，再把该 `app.json` 拷贝到本项目根目录使用。

示例（假设官方工程目录名为 `demo` 且与本项目同级）：
```
cp ../demo/app.json ./app.json
```

字段说明（参考 `app.example.json`，仅用于字段含义说明）：
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
