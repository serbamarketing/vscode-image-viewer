# VSCode Image Viewer 项目规范文档

## 一、项目描述

**Image Viewer** 是一款 VSCode 扩展，用于在当前项目中浏览、管理和预览所有图片资源。用户可通过右键菜单或命令面板打开图片查看器 Webview，以缩略图形式展示项目内图片，支持搜索、筛选、复制 Base64 等操作。

### 核心功能

- **缩略图展示**：按目录分组展示所有图片，支持调整缩略图尺寸、预览原图（缩放/旋转）
- **搜索与筛选**：按名称/类型/路径搜索，支持包含或排除指定文件夹
- **复制操作**：支持复制 Base64、文件名、路径
- **背景切换**：切换图片背景色（适用于 SVG、PNG 等透明图片）
- **项目配置**：每个项目的设置独立存储在本地配置文件
- **性能优化**：图片数量超过 100 时启用懒加载，测试支持 10,000+ 图片

### 激活方式

- 右键菜单：在编辑器或资源管理器中右键 → `View Images`
- 命令面板：`Ctrl+Shift+P` / `Cmd+Shift+P` → 输入 `View Images`

---

## 二、技术栈

### 运行环境

| 类别 | 技术 |
|------|------|
| 平台 | VSCode Extension API (^1.60.0) |
| 语言 | TypeScript 4.x |
| 构建 | Webpack 5 |

### 扩展端（Node 环境）

- **框架**：VSCode Extension API
- **核心依赖**：`@easy_vscode/core`、`@easy_vscode/webview`（内部 Webview 框架）
- **工具库**：`fs-extra`、`glob`、`image-size`、`json5`、`lodash`

### Webview 端（浏览器环境）

| 类别 | 技术 |
|------|------|
| UI 框架 | React 17 |
| 组件库 | Ant Design 4.x |
| 样式方案 | styled-components |
| 工具库 | ahooks、axios、clipboard、i18next、react-i18next |

### 构建与开发工具

- **打包**：Webpack 5（扩展端 + Webview 端分离配置）
- **编译**：Babel 7、ts-loader
- **代码规范**：ESLint、Prettier
- **包管理**：Yarn

---

## 三、项目结构

```
vscode-image-viewer/
├── src/
│   ├── extension.ts              # 扩展入口，激活时注册 Webview
│   ├── constants/                # 常量定义（命令、配置项等）
│   ├── types.ts                  # 全局类型定义
│   ├── webviewController/        # Webview 控制器
│   │   ├── index.ts              # 注册所有 Webview
│   │   └── imagesViewer/         # 图片查看器 Webview 配置
│   │       ├── index.ts          # 消息处理器、Webview 配置
│   │       ├── config.ts         # 本地配置文件读写
│   │       └── utils.ts          # 图片扫描、Base64 等工具
│   └── webview/                  # Webview 前端代码
│       ├── index.tsx             # 注册 React 组件
│       └── PreviewImages/        # 主界面组件
│           ├── index.tsx        # 主组件
│           ├── style.ts         # styled-components 样式
│           ├── ImageInfo/        # 图片信息与操作
│           ├── ImageLazyLoad/   # 懒加载图片组件
│           └── SettingsModal/   # 设置弹窗
├── scaffold/                     # Webview Webpack 入口 + vendored bundler（见 scaffold/README.md）
├── assets/                       # 静态资源
├── webpack.extension.js          # 扩展端 Webpack 配置
└── package.json
```

### 架构说明

- **扩展端**：`extension.ts` 激活后通过 `@easy_vscode/core` 注册 Webview，`webviewController` 负责消息通信与业务逻辑
- **Webview 端**：React SPA，通过 `callVscode` 与扩展端通信，使用 `MESSAGE_CMD` 定义的消息协议
- **通信方式**：Webview ↔ Extension 通过 `postMessage` + `invokeCallback` 实现请求-响应

---

## 四、代码规范与约定

### 4.1 通用规范

- **语言**：项目代码与注释使用英文，用户可见文案可使用中文
- **文件命名**：组件目录使用 PascalCase（如 `PreviewImages`），文件使用 `index.tsx` 或具体功能名
- **导入顺序**：第三方库 → 项目内部模块 → 相对路径，同类之间按字母序

### 4.2 TypeScript

- **配置**：`tsconfig.json` 中 `baseUrl: "src"`，支持从 `src` 根路径导入（如 `from 'types'`）
- **类型**：优先使用 `interface` 定义数据结构，导出类型使用 `I` 前缀（如 `IConfig`、`IImage`）
- **严格性**：`noImplicitAny`、`strictNullChecks` 为 `false`，新代码建议逐步收紧

### 4.3 格式化（Prettier）

```json
{
  "printWidth": 120,
  "trailingComma": "none",
  "tabWidth": 2,
  "semi": false,
  "singleQuote": true,
  "jsxSingleQuote": true
}
```

- 使用单引号，无分号，无尾随逗号
- 每行最大 120 字符

### 4.4 ESLint

- 使用 `@typescript-eslint/parser`、`plugin:react/recommended`
- **必须遵守**：`react-hooks/rules-of-hooks` 为 error
- **建议遵守**：`react-hooks/exhaustive-deps` 为 warn
- 命名约定、分号等由 Prettier 统一，ESLint 中关闭相关规则

### 4.5 React 组件

- 使用函数组件 + Hooks，不使用 class 组件
- 组件导出使用 `export default`，类型/接口使用 `export interface`
- 样式使用 `styled-components`，组件名以 `Styled` 或 `Style` 开头
- 常量使用 `useMemo`，回调使用 `useCallback`，避免不必要的重渲染

### 4.6 消息协议

- 所有扩展端与 Webview 通信命令定义在 `src/constants/index.ts` 的 `MESSAGE_CMD`
- 新增功能需在此添加命令常量，并在 `webviewController/imagesViewer/index.ts` 的 `messageHandlers` 中注册

### 4.7 常量与配置

- 魔法数字提取为常量（如 `THRESHOLD_ENABLE_LAZY_LOADING = 150`）
- 默认配置集中在 `config.ts` 的 `DEFAULT_CONFIG`
- 常量使用 `UPPER_SNAKE_CASE`，配置键使用 `camelCase`

### 4.8 性能相关

- 图片数量 > 100 时启用懒加载（`ImageLazyLoad` + `useInViewport`）
- 图片数量 > 1200 时默认折叠所有目录
- 尺寸滑块在图片较多时使用 `onAfterChange` 延迟更新，减少卡顿

---

## 五、开发命令

| 命令 | 说明 |
|------|------|
| `yarn` | 安装依赖 |
| `yarn compile` | 编译扩展 |
| `yarn watch` | 监听编译 |
| `yarn vendor:template` | 从 `easy-vscode/webview-templates` 同步 `scaffold/bundler` 并生成 `scaffold/webview.webpack.js`（新 clone 或换模板时；可加 `-- --force`） |
| `yarn ui-dev` | 启动 Webview 开发服务器 |
| `yarn ui-build` | 构建 Webview |
| `yarn package` | 完整打包（含 Webview 构建） |
| `yarn lint` | ESLint 检查 |
| `yarn check-type` | TypeScript 类型检查 |
| F5 | 在扩展开发宿主中调试 |

---

## 六、扩展点与依赖

- **@easy_vscode/core**：提供 `utils`（文件操作、项目路径等）、`webviewUtils`（Webview 注册、消息回调）
- **@easy_vscode/webview**：提供 `registerWebview`、`callVscode`，以及 Webview Webpack 基础配置
- 扩展通过 `registryWebview` 注册，通过 `messageHandlers` Map 处理来自 Webview 的消息

---

## 七、注意事项

1. **路径**：扩展端使用 Node 路径，Webview 端收到的是相对于项目根路径的字符串
2. **配置存储**：每个项目的配置存储在 `projectsConfig/{base64(projectPath)}.json`
3. **图片格式**：支持 `.svg`、`.png`、`.jpeg`、`.jpg`、`.ico`、`.gif`、`.webp`、`.bmp`、`.tif`、`.tiff`、`.apng`、`.avif`
4. **macOS 打开目录**：使用 `exec('open ${path}')`，其他平台需适配

---

## 八、Git 工作流

- **分支规范**：新需求前创建 `feature-xxx` 或 `feature-xxx-yyy` 分支，遵循 GitHub 常规 Git Flow
- **单分支单事**：一个分支只做一件事，不混入无关改动
