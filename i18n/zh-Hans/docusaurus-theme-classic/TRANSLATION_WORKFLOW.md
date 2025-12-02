# 翻译工作流程

本文档描述如何为 LeanSpec 文档站点贡献中文翻译。

## 翻译文件组织

```
docs-site/
  i18n/zh-Hans/               # 中文（简体）翻译根目录
    code.json                 # UI 标签和主题文本
    docusaurus-theme-classic/
      navbar.json             # 导航栏翻译
      footer.json             # 页脚翻译
    docusaurus-plugin-content-docs/
      current/                # 文档翻译
        guide/
          getting-started.mdx
          index.mdx
          understanding.mdx
          first-principles.mdx
          ...
    docusaurus-plugin-content-blog/
      ...                     # 博客翻译（未来）
```

## 翻译新页面

### 1. 检查英文源文件

找到要翻译的英文文件位置：
```bash
# 文档通常在这里
docs-site/docs/guide/...
docs-site/docs/reference/...
```

### 2. 创建对应的中文文件

在 `i18n/zh-Hans` 目录下创建相同的目录结构：

```bash
# 示例：翻译 docs/guide/philosophy.mdx
mkdir -p i18n/zh-Hans/docusaurus-plugin-content-docs/current/guide
touch i18n/zh-Hans/docusaurus-plugin-content-docs/current/guide/philosophy.mdx
```

### 3. 翻译内容

- 复制英文文件内容到中文文件
- 翻译前置元数据（frontmatter）中的 `title`
- 翻译正文内容，遵循[翻译风格指南](./TRANSLATION_STYLE_GUIDE.md)
- 保持代码、命令、文件名为英文
- 正确转义 MDX 特殊字符（`<`、`>`、`&`）

### 4. 测试构建

```bash
cd docs-site
npm run build
```

确保没有错误。如果有 MDX 编译错误，检查特殊字符是否正确转义。

### 5. 本地预览

```bash
# 预览中文站点
npm run start -- --locale zh-Hans

# 或者构建后使用 serve 预览
npm run build
npm run serve
```

访问 `http://localhost:3000/zh-Hans/` 查看中文版本。

## 翻译 UI 文本

### 更新 UI 标签

编辑相应的 JSON 文件：

```bash
# 导航栏
i18n/zh-Hans/docusaurus-theme-classic/navbar.json

# 页脚
i18n/zh-Hans/docusaurus-theme-classic/footer.json

# 侧边栏类别
i18n/zh-Hans/docusaurus-plugin-content-docs/current.json

# 通用 UI 文本
i18n/zh-Hans/code.json
```

JSON 格式：
```json
{
  "item.label.Guide": {
    "message": "指南",
    "description": "Navbar item with label Guide"
  }
}
```

## 翻译状态跟踪

### 当前翻译状态

#### ✅ 已完成
- 导航栏和页脚 UI
- 侧边栏类别
- 核心概念页面：
  - 快速开始 (Getting Started)
  - 概述 (Overview)
  - 理解 LeanSpec (Understanding)
  - 第一原则 (First Principles)
- 博客文章：
  - 欢迎使用 LeanSpec (Welcome to LeanSpec)
  - 为什么大型规范会让你的 AI 代理变笨（以及如何解决）(AI Agent Performance)

#### 🚧 待翻译（优先级高）
- 上下文工程 (Context Engineering)
- AI 代理记忆 (AI Agent Memory)
- 哲学与思维方式 (Philosophy)
- CLI 命令参考 (CLI Reference)
- MCP 服务器参考 (MCP Server)

#### 📝 待翻译（优先级中）
- 使用指南下的所有子页面
- 前置元数据参考 (Frontmatter Reference)
- 配置参考 (Config Reference)
- 路线图 (Roadmap)
- FAQ

#### 💡 未来考虑
- 比较页面 (Comparison)
- 开发指南 (Development)

## 更新现有翻译

当英文文档更新时：

1. 检查对应的中文文件
2. 对比英文版本的更改
3. 更新中文翻译以匹配新内容
4. 测试构建
5. 提交更改

## Docusaurus i18n 命令

### 提取翻译文本

自动生成翻译文件（已完成，通常不需要重新运行）：
```bash
npx docusaurus write-translations --locale zh-Hans
```

### 开发时使用特定语言

```bash
npm run start -- --locale zh-Hans
```

### 构建特定语言

```bash
npm run build -- --locale zh-Hans
```

### 构建所有语言

```bash
npm run build
```

## 贡献流程

1. **Fork 仓库**
2. **创建分支**：`git checkout -b translate-zh-page-name`
3. **添加/更新翻译**
4. **测试构建**：`npm run build`
5. **提交更改**：使用清晰的提交消息（中英文均可）
6. **创建 Pull Request**
7. **等待审查**

## 翻译质量标准

在提交 PR 前，确保：

- [ ] 遵循[翻译风格指南](./TRANSLATION_STYLE_GUIDE.md)
- [ ] 术语使用一致
- [ ] 代码和命令保持英文
- [ ] MDX 特殊字符正确转义
- [ ] 链接有效（指向中文版本）
- [ ] 构建成功无错误
- [ ] 在本地预览过翻译效果

## 获取帮助

- 查看[翻译风格指南](./TRANSLATION_STYLE_GUIDE.md)
- 参考已完成的翻译文件
- 在 GitHub Issues 中提问
- 联系项目维护者

## 资源

- [Docusaurus i18n 文档](https://docusaurus.io/zh-CN/docs/i18n/introduction)
- [LeanSpec 翻译风格指南](./TRANSLATION_STYLE_GUIDE.md)
- [MDX 语法指南](https://mdxjs.com/docs/)
