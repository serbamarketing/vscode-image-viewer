# Ant Design 升级需求分析

> 分析目标：判断哪些 Issues 需要将 Ant Design 从 v4 升级到 v5 或 v6，并评估需求合理性与优先级

---

## 一、项目现状

| 技术 | 当前版本 |
|------|----------|
| React | 17 |
| Ant Design | 4.x |
| @ant-design/icons | 4.x |

项目使用的 Ant Design 组件：`Alert`、`Button`、`Checkbox`、`Collapse`、`ConfigProvider`、`Empty`、`Image`、`Input`、`Skeleton`、`Slider`、`Space`、`Spin`、`Tag`、`Tooltip`、`Modal`、`Dropdown`、`Menu`、`message`。

---

## 二、各 Issue 与 Ant Design 升级的关联分析

### 2.1 无需升级 Ant Design 的 Issues

| 分类 | 文件 | 原因 |
|------|------|------|
| 排序与顺序 | [01-sorting.md](./01-sorting.md) | 纯业务逻辑（`sortImageFn`、排序选项），与 UI 组件无关 |
| 刷新与加载 | [02-refresh-loading.md](./02-refresh-loading.md) | 文件监听、性能优化、Remote SSH，均为扩展端/逻辑层 |
| 搜索与过滤 | [05-search-filter.md](./05-search-filter.md) | 正则匹配逻辑，Input 组件无需升级 |
| 功能增强-拖拽 | [06-features.md](./06-features.md) | 拖拽可用 `react-dnd` 或原生 API 实现，不依赖 Ant Design |
| 功能增强-列数滑块 | [06-features.md](./06-features.md) | Slider 在 v4/v5 功能一致，PR 可基于现有版本合并 |

---

### 2.2 建议升级 Ant Design 的 Issues

#### 2.2.1 主题与背景 [04-theme-background.md](./04-theme-background.md)

**关联需求**：
- 跟随 VS Code 主题（暗色/亮色自动切换）
- 棋盘格背景选项
- 手动切换背景

**为何需要升级**：

| 对比项 | Ant Design 4 | Ant Design 5 |
|--------|--------------|--------------|
| 主题机制 | Less 变量，需编译时定制 | CSS-in-JS + Design Token，运行时切换 |
| 暗色模式 | 需手动覆盖大量 less 变量 | `ConfigProvider theme={{ algorithm: darkAlgorithm }}` 一行切换 |
| 与 VSCode 主题联动 | 需大量 CSS 覆盖 | 通过 `vscode.getColorTheme()` 获取主题后，动态传入 `ConfigProvider` 即可 |

**结论**：**强烈建议升级至 Ant Design 5**。实现「跟随 VS Code 主题」在 v4 下需大量样式覆盖，v5 的 Design Token 与 `ConfigProvider` 可大幅简化实现。

**棋盘格背景**：与 Ant Design 无关，可用 CSS `repeating-conic-gradient` 或背景图实现，不依赖升级。

---

#### 2.2.2 预览体验 [03-preview-ux.md](./03-preview-ux.md)

**关联需求**：
- 预览弹窗显示文件名（#29）
- 降低遮罩透明度（#28）

**为何可能受益于升级**：

| 需求 | Ant Design 4 | Ant Design 5 |
|------|--------------|--------------|
| 预览弹窗显示文件名 | `Image.PreviewGroup` 无 toolbar 自定义 API，需通过 DOM 查找或 CSS 伪元素 hack | 支持 `toolbarRender` 等自定义能力，可更优雅地添加文件名展示 |
| 降低遮罩透明度 | 通过 CSS 覆盖 `.ant-image-preview-mask` 的 `opacity` 即可实现 | 同样支持，无本质差异 |

**结论**：**可选升级**。  
- 「降低遮罩透明度」在 v4 下用 CSS 即可，无需升级。  
- 「预览弹窗显示文件名」在 v5 下实现更简洁，但 v4 也可通过 `preview.toolbarRender`（若存在）或 DOM 操作实现。需核实 v4 的 `Image.Preview` 是否支持 `toolbarRender`。

---

## 三、Ant Design 5 vs 6 选择建议

| 版本 | React 要求 | 升级成本 | 建议 |
|------|------------|----------|------|
| **Ant Design 5** | React 16.9+ | 中等，API 有部分变更 | **推荐**：满足主题、预览需求，且与 React 17 兼容 |
| **Ant Design 6** | React 18+ | 高，需同步升级 React 18 | 暂不推荐：当前为 React 17，升级链较长 |

**结论**：优先升级至 **Ant Design 5**，待 React 生态稳定后再考虑 v6。

---

## 四、需求合理性与优先级排序

### 4.1 升级必要性（按 Issue 分类）

| 优先级 | Issue 分类 | 升级必要性 | 理由 |
|--------|------------|------------|------|
| **P0** | 主题与背景 (04) | **必须** | 暗色主题适配是高频需求，v4 实现成本高，v5 可显著降低开发量 |
| **P1** | 预览体验 (03) | **建议** | 预览弹窗自定义在 v5 更易实现，但 v4 有替代方案 |
| **P2** | 其他 (01/02/05/06) | **不需要** | 与 Ant Design 无关 |

### 4.2 需求合理性评估

| 需求 | 合理性 | 说明 |
|------|--------|------|
| 跟随 VS Code 主题 | ✅ 高 | 用户长期使用暗色主题，白底图片查看器造成视觉割裂，符合主流 IDE 扩展体验 |
| 棋盘格背景 | ✅ 高 | 设计/游戏行业常见需求，透明图预览标配 |
| 预览弹窗显示文件名 | ✅ 高 | 数据科学等场景下文件名含元数据，浏览时需快速识别 |
| 降低遮罩透明度 | ✅ 中 | 提升专注度，实现简单 |

### 4.3 综合优先级建议

```
1. 升级 Ant Design 4 → 5（为 04、03 打基础）
2. 实现 04-theme-background（暗色主题 + 棋盘格）
3. 实现 03-preview-ux（文件名 + 遮罩）
4. 其他 Issues 按原计划推进，无需等待 Ant Design 升级
```

---

## 五、升级注意事项（Ant Design 4 → 5）

1. **ConfigProvider**：`locale` 等 API 有调整，需检查 [迁移文档](https://ant.design/docs/react/migration-v5-cn)
2. **Form**：若后续使用，v5 的 Form  API 有较大变更
3. **Icon**：`@ant-design/icons` 需同步升级，部分图标用法可能变化
4. **样式**：v5 移除 less，采用 CSS-in-JS，若有全局覆盖需调整
5. **easy-vscode**：`@easy_vscode/webview` 若也依赖 antd，需确认兼容性或同步升级

---

## 六、总结

| 问题 | 答案 |
|------|------|
| **哪些 Issues 需要升级 Ant Design？** | 主要是 **04-theme-background**（必须），**03-preview-ux**（建议） |
| **升级到 v5 还是 v6？** | **v5**，与 React 17 兼容，成本可控 |
| **需求是否合理？** | 是，主题适配与预览体验均为合理且高频需求 |
| **推荐实施顺序？** | 先升级 Ant Design 5 → 实现 04 → 实现 03 → 其余 Issues 独立推进 |

---

## 七、正确升级顺序（easy-vscode + vscode-image-viewer）

**两个项目需同步升级，且 easy-vscode 必须先发布：**

1. **easy-vscode**：升级 antd → 发布 @easy_vscode/webview@1.7.0
2. **vscode-image-viewer**：更新依赖 @easy_vscode/webview ^1.7.0 → 发布
