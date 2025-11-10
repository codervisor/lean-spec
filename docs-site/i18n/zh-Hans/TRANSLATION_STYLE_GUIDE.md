# LeanSpec 中文翻译风格指南

## 翻译原则

### 1. 保持技术术语一致性

核心术语保持英文或使用统一的中文翻译：

| 英文 | 中文 | 说明 |
|------|------|------|
| Spec | 规范 / 规范文档 | 上下文中可以简称"规范" |
| LeanSpec | LeanSpec | 保持英文，作为产品名 |
| Working memory | 工作记忆 | 心理学术语 |
| Context window | 上下文窗口 | AI 术语 |
| Token | 令牌 | AI/NLP 术语 |
| Context Economy | 上下文经济 | 核心原则，保持统一 |
| Signal-to-Noise | 信噪比 | 技术术语 |
| Progressive Disclosure | 渐进式披露 | UI/UX 术语 |
| CLI | CLI | 保持英文 |
| MCP | MCP | 保持英文（Model Context Protocol） |
| Frontmatter | 前置元数据 | Markdown 术语 |
| AI agent | AI 代理 | - |
| Spec-Driven Development (SDD) | 规范驱动开发（SDD） | 首次出现时注明英文缩写 |

### 2. 语言风格

- **简洁明了**：遵循 LeanSpec 的 Signal-to-Noise 原则，翻译应简洁
- **技术准确**：保持技术术语的准确性
- **自然流畅**：避免过度直译，使用自然的中文表达
- **避免过度正式**：使用"您"而不是"阁下"，保持友好专业的语气

### 3. 代码和命令

- **代码块内容保持英文**：所有代码、命令、文件名保持原样
- **代码注释可以翻译**：如果原文中有注释，可以翻译
- **命令示例保持英文**：如 `lean-spec create my-feature`

### 4. 标点符号

- 中文使用中文标点：，。！？：；
- 英文/代码使用英文标点：, . ! ? : ;
- 引号：中文内容使用""，英文/代码使用""
- 列表项后的标点：遵循中文习惯

### 5. 数字和单位

- 数字通常使用阿拉伯数字：300 行，24 小时
- 时间范围：5-10 分钟
- 百分比：90%（使用英文符号）

## 常见翻译对照

### 动作动词

| 英文 | 中文 |
|------|------|
| Create | 创建 |
| Update | 更新 |
| Delete | 删除 |
| Archive | 归档 |
| List | 列出 |
| View | 查看 |
| Search | 搜索 |
| Validate | 验证 |

### 概念术语

| 英文 | 中文 |
|------|------|
| Intent | 意图 |
| Implementation | 实现 |
| Constraint | 约束 |
| Trade-off | 权衡 |
| Success criteria | 成功标准 |
| Acceptance criteria | 验收标准 |
| Edge case | 边缘情况 |
| Breaking change | 破坏性变化 |

### 状态和优先级

| 英文 | 中文 |
|------|------|
| Planned | 已计划 / 计划中 |
| In Progress | 进行中 |
| Complete | 已完成 |
| Archived | 已归档 |
| High priority | 高优先级 |
| Medium priority | 中优先级 |
| Low priority | 低优先级 |

## MDX 特殊注意事项

### 转义字符

在 MDX 文件中，某些字符需要转义：

- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`

示例：
```markdown
❌ 错误：<300 行
✅ 正确：&lt;300 行
```

### 保持原有结构

- 保持原文的标题层级
- 保持原文的列表结构
- 保持原文的代码块和语言标注
- 保持原文的链接格式

## 质量检查清单

翻译完成后，检查：

- [ ] 术语使用一致
- [ ] 代码和命令保持英文
- [ ] MDX 特殊字符已正确转义
- [ ] 链接指向正确（指向中文版本）
- [ ] 语句通顺自然
- [ ] 标点符号正确
- [ ] 构建无错误（`npm run build`）

## 示例

### 良好的翻译

**原文：**
> LeanSpec is a lightweight, agile Spec-Driven Development (SDD) methodology designed to keep specs under 300 lines.

**翻译：**
> LeanSpec 是一种轻量级、敏捷的规范驱动开发（SDD）方法论，旨在将规范保持在 300 行以内。

### 避免的翻译

**❌ 过度直译：**
> LeanSpec 是一个轻量的，敏捷的，规范-驱动的发展方法论...

**❌ 过度正式：**
> LeanSpec 乃一种轻量级之规范驱动开发方法论...

**❌ 术语不一致：**
在同一文档中，"spec" 有时翻译为"规范"，有时翻译为"说明书"

## 更新和维护

- 英文文档是真实来源（source of truth）
- 中文翻译可能滞后于英文更新
- 发现英文文档更新时，及时更新对应的中文翻译
- 保持翻译的准确性和时效性
