//! # Atlassian Document Format (ADF) ↔ Markdown
//!
//! Pure-Rust bidirectional converter between Atlassian Document Format (the
//! JSON tree Jira uses for issue descriptions and comments) and markdown.
//!
//! See `specs/397-jira-adf-markdown-converter` and issue #272 for the full
//! design and the list of supported node types.

use pulldown_cmark::{CodeBlockKind, Event, HeadingLevel, Options, Parser, Tag, TagEnd};
use serde_json::{json, Value};
use thiserror::Error;

/// Errors returned by [`to_markdown`].
#[derive(Debug, Error)]
pub enum AdfError {
    /// The supplied JSON is not a valid ADF document.
    #[error("invalid ADF structure: {0}")]
    InvalidStructure(String),
    /// A node type was encountered that the converter explicitly refuses to
    /// fall back on. (Currently unused — unknown nodes degrade to plain text.)
    #[error("unsupported node type: {0}")]
    UnsupportedNode(String),
}

// =============================================================================
// ADF → markdown
// =============================================================================

/// Convert an ADF JSON document to a markdown string.
///
/// Returns [`AdfError::InvalidStructure`] if the root is not `{ "type": "doc" }`.
/// Unknown node types are rendered as plain text rather than erroring — see
/// [`render_unknown_block`].
pub fn to_markdown(adf: &Value) -> Result<String, AdfError> {
    let ty =
        node_type(adf).ok_or_else(|| AdfError::InvalidStructure("missing 'type' field".into()))?;
    if ty != "doc" {
        return Err(AdfError::InvalidStructure(format!(
            "expected root type 'doc', got '{ty}'"
        )));
    }
    let mut ctx = RenderCtx::default();
    let children = adf
        .get("content")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut blocks: Vec<String> = Vec::new();
    for child in &children {
        let s = render_block(child, &mut ctx)?;
        if !s.is_empty() {
            blocks.push(s);
        }
    }
    let mut out = blocks.join("\n\n");
    if !out.is_empty() {
        out.push('\n');
    }
    Ok(out)
}

#[derive(Default)]
struct RenderCtx {
    // Reserved for future depth-aware rendering (currently unused — list
    // indentation is handled by `prefix_lines`).
}

fn node_type(v: &Value) -> Option<&str> {
    v.get("type")?.as_str()
}

fn child_array(node: &Value) -> Vec<Value> {
    node.get("content")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
}

fn render_block(node: &Value, ctx: &mut RenderCtx) -> Result<String, AdfError> {
    let ty = node_type(node)
        .ok_or_else(|| AdfError::InvalidStructure("block node missing 'type'".into()))?;
    match ty {
        "paragraph" => Ok(render_inline_content(node)),
        "heading" => {
            let level = node
                .get("attrs")
                .and_then(|a| a.get("level"))
                .and_then(|l| l.as_u64())
                .unwrap_or(1)
                .clamp(1, 6) as usize;
            let inline = render_inline_content(node);
            Ok(format!("{} {}", "#".repeat(level), inline))
        }
        "bulletList" => render_bullet_list(node, ctx),
        "orderedList" => render_ordered_list(node, ctx),
        "taskList" => render_task_list(node, ctx),
        "codeBlock" => Ok(render_code_block(node)),
        "blockquote" => render_blockquote(node, ctx),
        "rule" => Ok("---".to_string()),
        "table" => render_table(node),
        _ => Ok(render_unknown_block(node, ty)),
    }
}

fn render_bullet_list(node: &Value, ctx: &mut RenderCtx) -> Result<String, AdfError> {
    let items = child_array(node);
    let mut parts = Vec::with_capacity(items.len());
    for item in &items {
        let text = render_list_item(item, ctx)?;
        parts.push(prefix_lines("- ", "  ", &text));
    }
    Ok(parts.join("\n"))
}

fn render_ordered_list(node: &Value, ctx: &mut RenderCtx) -> Result<String, AdfError> {
    let start = node
        .get("attrs")
        .and_then(|a| a.get("order"))
        .and_then(|o| o.as_u64())
        .unwrap_or(1);
    let items = child_array(node);
    let mut parts = Vec::with_capacity(items.len());
    for (i, item) in items.iter().enumerate() {
        let n = start + i as u64;
        let text = render_list_item(item, ctx)?;
        let first = format!("{n}. ");
        let cont = " ".repeat(first.len());
        parts.push(prefix_lines(&first, &cont, &text));
    }
    Ok(parts.join("\n"))
}

fn render_list_item(node: &Value, ctx: &mut RenderCtx) -> Result<String, AdfError> {
    let children = child_array(node);
    let mut out = String::new();
    for (i, child) in children.iter().enumerate() {
        let s = render_block(child, ctx)?;
        if s.is_empty() {
            continue;
        }
        if !out.is_empty() {
            let prev_is_list = matches!(
                node_type(&children[i - 1]),
                Some("bulletList" | "orderedList" | "taskList")
            );
            let cur_is_list = matches!(
                node_type(child),
                Some("bulletList" | "orderedList" | "taskList")
            );
            // A leading paragraph followed by a nested list can join with a
            // single newline (CommonMark accepts a tight item ending with a
            // sublist). Two paragraphs or paragraph-after-block need a blank
            // line between them.
            if prev_is_list || cur_is_list {
                out.push('\n');
            } else {
                out.push_str("\n\n");
            }
        }
        out.push_str(&s);
    }
    Ok(out)
}

fn render_task_list(node: &Value, _ctx: &mut RenderCtx) -> Result<String, AdfError> {
    let items = child_array(node);
    let mut lines = Vec::with_capacity(items.len());
    for item in &items {
        if node_type(item) != Some("taskItem") {
            continue;
        }
        let state = item
            .get("attrs")
            .and_then(|a| a.get("state"))
            .and_then(|s| s.as_str())
            .unwrap_or("TODO");
        let checked = state.eq_ignore_ascii_case("DONE");
        let text = render_inline_content(item);
        let marker = if checked { "[x]" } else { "[ ]" };
        lines.push(format!("- {marker} {text}"));
    }
    Ok(lines.join("\n"))
}

fn render_code_block(node: &Value) -> String {
    let lang = node
        .get("attrs")
        .and_then(|a| a.get("language"))
        .and_then(|l| l.as_str())
        .unwrap_or("");
    let text = collect_text(node);
    format!("```{lang}\n{text}\n```")
}

fn render_blockquote(node: &Value, ctx: &mut RenderCtx) -> Result<String, AdfError> {
    let children = child_array(node);
    let mut parts = Vec::new();
    for child in &children {
        let s = render_block(child, ctx)?;
        if !s.is_empty() {
            parts.push(s);
        }
    }
    let inner = parts.join("\n\n");
    let mut out = String::new();
    for (i, line) in inner.lines().enumerate() {
        if i > 0 {
            out.push('\n');
        }
        if line.is_empty() {
            out.push('>');
        } else {
            out.push_str("> ");
            out.push_str(line);
        }
    }
    Ok(out)
}

fn render_table(node: &Value) -> Result<String, AdfError> {
    let rows = child_array(node);
    if rows.is_empty() {
        return Ok(String::new());
    }

    let mut grid: Vec<Vec<String>> = Vec::new();
    let mut first_row_is_header = false;
    for (ri, row) in rows.iter().enumerate() {
        if node_type(row) != Some("tableRow") {
            continue;
        }
        let cells = child_array(row);
        let mut row_strs = Vec::with_capacity(cells.len());
        let mut all_header = !cells.is_empty();
        for cell in &cells {
            let cty = node_type(cell);
            if cty != Some("tableCell") && cty != Some("tableHeader") {
                continue;
            }
            if cty != Some("tableHeader") {
                all_header = false;
            }
            row_strs.push(render_table_cell(cell));
        }
        if ri == 0 && all_header {
            first_row_is_header = true;
        }
        grid.push(row_strs);
    }

    let cols = grid.iter().map(|r| r.len()).max().unwrap_or(0);
    if cols == 0 {
        return Ok(String::new());
    }

    // Pad rows to equal column count.
    for row in &mut grid {
        while row.len() < cols {
            row.push(String::new());
        }
    }

    // If no explicit header row, synthesize an empty one — GFM requires it.
    let mut output_rows: Vec<Vec<String>> = Vec::new();
    if first_row_is_header {
        output_rows.push(grid.remove(0));
    } else {
        output_rows.push(vec![String::new(); cols]);
    }
    let sep: Vec<String> = (0..cols).map(|_| "---".to_string()).collect();
    output_rows.push(sep);
    output_rows.extend(grid);

    let mut out = String::new();
    for (i, row) in output_rows.iter().enumerate() {
        if i > 0 {
            out.push('\n');
        }
        out.push('|');
        for cell in row {
            out.push(' ');
            out.push_str(cell);
            out.push_str(" |");
        }
    }
    Ok(out)
}

fn render_table_cell(node: &Value) -> String {
    let children = child_array(node);
    let mut parts = Vec::new();
    for child in &children {
        match node_type(child) {
            Some("paragraph") => parts.push(render_inline_content(child)),
            Some(_) => parts.push(collect_text(child)),
            None => {}
        }
    }
    // Pipes inside a cell would break the table — escape them.
    parts.join(" ").replace('|', "\\|").replace('\n', " ")
}

fn render_unknown_block(node: &Value, ty: &str) -> String {
    // Sanitize `ty` so attacker-controlled node types can't break out of the
    // HTML comment (`-->`) or inject newlines into the marker line.
    let safe_ty: String = ty
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == ':' {
                c
            } else {
                '_'
            }
        })
        .collect();
    // Drop any `--` runs which would terminate the HTML comment.
    let safe_ty = safe_ty.replace("--", "__");
    let text = escape_md_text(&collect_text(node));
    format!("<!-- adf:{safe_ty} -->\n{text}")
        .trim_end()
        .to_string()
}

/// Escape markdown metacharacters in plain text so they round-trip as literal
/// characters instead of being re-interpreted as formatting.
fn escape_md_text(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '\\' | '*' | '_' | '`' | '[' | ']' | '<' | '>' | '|' | '~' => {
                out.push('\\');
                out.push(c);
            }
            _ => out.push(c),
        }
    }
    out
}

/// Render text as a markdown code span, picking a backtick delimiter long
/// enough to not collide with backtick runs inside the text.
fn render_code_span(text: &str) -> String {
    let max_run = max_backtick_run(text);
    let n = max_run + 1;
    let delim = "`".repeat(n);
    let needs_pad = text.starts_with('`') || text.ends_with('`') || text.is_empty();
    if needs_pad {
        format!("{delim} {text} {delim}")
    } else {
        format!("{delim}{text}{delim}")
    }
}

fn max_backtick_run(s: &str) -> usize {
    let mut max = 0usize;
    let mut cur = 0usize;
    for c in s.chars() {
        if c == '`' {
            cur += 1;
            if cur > max {
                max = cur;
            }
        } else {
            cur = 0;
        }
    }
    max
}

fn render_inline_content(node: &Value) -> String {
    let children = child_array(node);
    let mut out = String::new();
    for child in &children {
        out.push_str(&render_inline_node(child));
    }
    out
}

fn render_inline_node(node: &Value) -> String {
    match node_type(node) {
        Some("text") => {
            let text = node.get("text").and_then(|t| t.as_str()).unwrap_or("");
            let marks = node
                .get("marks")
                .and_then(|m| m.as_array())
                .cloned()
                .unwrap_or_default();
            apply_marks(text, &marks)
        }
        Some("hardBreak") => "  \n".to_string(),
        Some("mention") => {
            let attrs = node.get("attrs");
            let text = attrs
                .and_then(|a| a.get("text"))
                .and_then(|t| t.as_str())
                .map(|s| s.to_string());
            let id = attrs
                .and_then(|a| a.get("id"))
                .and_then(|i| i.as_str())
                .unwrap_or("");
            match text {
                Some(t) if !t.is_empty() => t,
                _ => format!("@{id}"),
            }
        }
        Some("emoji") => {
            let short = node
                .get("attrs")
                .and_then(|a| a.get("shortName"))
                .and_then(|s| s.as_str())
                .unwrap_or("");
            let short = short.trim_matches(':');
            format!(":{short}:")
        }
        Some("inlineCard") => {
            let url = node
                .get("attrs")
                .and_then(|a| a.get("url"))
                .and_then(|u| u.as_str())
                .unwrap_or("");
            if url.is_empty() {
                String::new()
            } else {
                format!("[{url}]({url})")
            }
        }
        Some("mediaInline") | Some("media") => {
            let attrs = node.get("attrs");
            let url = attrs
                .and_then(|a| a.get("url"))
                .and_then(|u| u.as_str())
                .unwrap_or("");
            let alt = attrs
                .and_then(|a| a.get("alt"))
                .and_then(|a| a.as_str())
                .unwrap_or("");
            if url.is_empty() {
                String::new()
            } else {
                format!("![{alt}]({url})")
            }
        }
        _ => collect_text(node),
    }
}

fn apply_marks(text: &str, marks: &[Value]) -> String {
    let mut is_code = false;
    let mut link_url: Option<String> = None;
    let mut has_strong = false;
    let mut has_em = false;
    let mut has_strike = false;
    for mark in marks {
        match node_type(mark) {
            Some("code") => is_code = true,
            Some("strong") => has_strong = true,
            Some("em") => has_em = true,
            Some("strike") => has_strike = true,
            Some("link") => {
                link_url = mark
                    .get("attrs")
                    .and_then(|a| a.get("href"))
                    .and_then(|h| h.as_str())
                    .map(|s| s.to_string());
            }
            // underline, textColor, subsup: no markdown equivalent — drop.
            _ => {}
        }
    }

    let mut result = if is_code {
        // Code spans don't combine with other marks and must be rendered raw
        // (no markdown escaping inside); use a backtick run wide enough to
        // not collide with backticks in the text itself.
        render_code_span(text)
    } else {
        let escaped = escape_md_text(text);
        let mut r = escaped;
        if has_strike {
            r = format!("~~{r}~~");
        }
        if has_em {
            r = format!("_{r}_");
        }
        if has_strong {
            r = format!("**{r}**");
        }
        r
    };
    if let Some(url) = link_url {
        // Inside a link's destination, only `)` and whitespace are
        // problematic. Leave it alone — `from_markdown` always produces
        // well-formed URLs and arbitrary `href` content is the adapter's
        // responsibility.
        result = format!("[{result}]({url})");
    }
    result
}

/// Recursively collect raw text from a node tree — used as a fallback for
/// unknown node types so content is never silently dropped.
fn collect_text(node: &Value) -> String {
    if let Some(t) = node.get("text").and_then(|t| t.as_str()) {
        return t.to_string();
    }
    let mut out = String::new();
    if let Some(children) = node.get("content").and_then(|v| v.as_array()) {
        for child in children {
            out.push_str(&collect_text(child));
        }
    }
    out
}

fn prefix_lines(first: &str, rest: &str, text: &str) -> String {
    if text.is_empty() {
        return first.trim_end().to_string();
    }
    // Trim trailing whitespace from the continuation prefix when emitting it
    // on a blank line — keeps the line "blank" visually but ensures the
    // container (list item / blockquote) treats it as a continuation rather
    // than as a terminator. CommonMark allows blank lines inside a list item
    // as long as the next non-blank line is indented, but stricter parsers
    // (and pulldown_cmark itself) are more reliable when blank lines carry
    // the continuation prefix.
    let rest_trimmed = rest.trim_end();
    let mut out = String::new();
    for (i, line) in text.split('\n').enumerate() {
        if i > 0 {
            out.push('\n');
        }
        if i == 0 {
            out.push_str(first);
            out.push_str(line);
        } else if line.is_empty() {
            out.push_str(rest_trimmed);
        } else {
            out.push_str(rest);
            out.push_str(line);
        }
    }
    out
}

// =============================================================================
// markdown → ADF
// =============================================================================

/// Convert a markdown string to an ADF JSON document.
///
/// Unknown constructs degrade to plain text paragraphs; this function never
/// returns an error.
pub fn from_markdown(markdown: &str) -> Value {
    let options =
        Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS;
    let parser = Parser::new_ext(markdown, options);

    let mut builder = AdfBuilder::new();
    for event in parser {
        builder.feed(event);
    }
    builder.finish()
}

#[derive(Debug)]
struct Frame {
    kind: FrameKind,
    content: Vec<Value>,
}

#[derive(Debug)]
enum FrameKind {
    Doc,
    Paragraph,
    Heading,
    BulletList,
    OrderedList {
        start: u64,
    },
    /// `task` is set to `Some(_)` once a `TaskListMarker` upgrades this item
    /// (and its parent list) into a task entry. The bool is the checked state.
    ListItem {
        task: Option<bool>,
    },
    BlockQuote,
    CodeBlock {
        lang: Option<String>,
        text: String,
    },
    Table,
    TableRow {
        is_header: bool,
    },
    TableCell {
        is_header: bool,
    },
    /// Open while `Tag::Image` is in scope. Inner text becomes the alt; on
    /// close we emit a `mediaInline` node into the parent.
    Image {
        url: String,
    },
}

struct AdfBuilder {
    stack: Vec<Frame>,
    // Stack of inline marks currently in scope (strong, em, strike, link).
    marks: Vec<Value>,
}

impl AdfBuilder {
    fn new() -> Self {
        Self {
            stack: vec![Frame {
                kind: FrameKind::Doc,
                content: Vec::new(),
            }],
            marks: Vec::new(),
        }
    }

    fn top_mut(&mut self) -> &mut Frame {
        self.stack
            .last_mut()
            .expect("stack always has at least the doc frame")
    }

    fn push_inline(&mut self, value: Value) {
        // CodeBlock collects raw text into its `text` field rather than
        // accepting inline nodes as content.
        if let Some(frame) = self.stack.last_mut() {
            if let FrameKind::CodeBlock { text, .. } = &mut frame.kind {
                if let Some(s) = value.get("text").and_then(|t| t.as_str()) {
                    text.push_str(s);
                    return;
                }
            }
        }
        self.top_mut().content.push(value);
    }

    fn push_block(&mut self, value: Value) {
        self.top_mut().content.push(value);
    }

    fn add_text(&mut self, text: &str) {
        if text.is_empty() {
            return;
        }
        let mut node = json!({ "type": "text", "text": text });
        if !self.marks.is_empty() {
            node["marks"] = Value::Array(self.marks.clone());
        }
        self.push_inline(node);
    }

    fn feed(&mut self, event: Event<'_>) {
        match event {
            Event::Start(tag) => self.start(tag),
            Event::End(tag) => self.end(tag),
            Event::Text(s) => {
                // If the top frame is a code block, append to its raw text.
                if let Some(frame) = self.stack.last_mut() {
                    if let FrameKind::CodeBlock { text, .. } = &mut frame.kind {
                        text.push_str(&s);
                        return;
                    }
                }
                self.add_text(&s);
            }
            Event::Code(s) => {
                let node = json!({
                    "type": "text",
                    "text": s.into_string(),
                    "marks": [{ "type": "code" }],
                });
                self.push_inline(node);
            }
            Event::SoftBreak => {
                // ADF has no soft-break concept. Encoding as `hardBreak`
                // preserves the line-break boundary on round-trip; the
                // alternative of collapsing to a space silently loses the
                // newline and changes text content.
                self.push_inline(json!({ "type": "hardBreak" }));
            }
            Event::HardBreak => {
                self.push_inline(json!({ "type": "hardBreak" }));
            }
            Event::Rule => {
                self.push_block(json!({ "type": "rule" }));
            }
            Event::TaskListMarker(checked) => {
                // pulldown_cmark emits this immediately after Start(Item) for
                // GFM task list items. Promote the current frame & its parent.
                if let Some(frame) = self.stack.last_mut() {
                    if let FrameKind::ListItem { task } = &mut frame.kind {
                        *task = Some(checked);
                    }
                }
            }
            Event::Html(s) | Event::InlineHtml(s) => {
                self.add_text(&s);
            }
            // Footnotes, math: degrade to literal text.
            Event::FootnoteReference(s) => self.add_text(&format!("[^{s}]")),
            Event::InlineMath(s) | Event::DisplayMath(s) => self.add_text(&s),
        }
    }

    fn start(&mut self, tag: Tag<'_>) {
        match tag {
            Tag::Paragraph => self.push_frame(FrameKind::Paragraph),
            Tag::Heading { .. } => self.push_frame(FrameKind::Heading),
            Tag::BlockQuote(_) => self.push_frame(FrameKind::BlockQuote),
            Tag::CodeBlock(kind) => {
                let lang = match kind {
                    CodeBlockKind::Fenced(s) => {
                        let s = s.into_string();
                        if s.is_empty() {
                            None
                        } else {
                            Some(s)
                        }
                    }
                    CodeBlockKind::Indented => None,
                };
                self.push_frame(FrameKind::CodeBlock {
                    lang,
                    text: String::new(),
                });
            }
            Tag::List(Some(start)) => self.push_frame(FrameKind::OrderedList { start }),
            Tag::List(None) => self.push_frame(FrameKind::BulletList),
            Tag::Item => self.push_frame(FrameKind::ListItem { task: None }),
            Tag::Table(_alignments) => self.push_frame(FrameKind::Table),
            Tag::TableHead => self.push_frame(FrameKind::TableRow { is_header: true }),
            Tag::TableRow => self.push_frame(FrameKind::TableRow { is_header: false }),
            Tag::TableCell => {
                let is_header = matches!(
                    self.stack.last(),
                    Some(Frame {
                        kind: FrameKind::TableRow { is_header: true },
                        ..
                    })
                );
                self.push_frame(FrameKind::TableCell { is_header });
            }
            Tag::Emphasis => self.marks.push(json!({ "type": "em" })),
            Tag::Strong => self.marks.push(json!({ "type": "strong" })),
            Tag::Strikethrough => self.marks.push(json!({ "type": "strike" })),
            Tag::Link { dest_url, .. } => {
                self.marks.push(json!({
                    "type": "link",
                    "attrs": { "href": dest_url.into_string() },
                }));
            }
            Tag::Image { dest_url, .. } => {
                // Open a dedicated frame so inner text events accumulate into
                // the alt-text accumulator without polluting the marks stack.
                self.push_frame(FrameKind::Image {
                    url: dest_url.into_string(),
                });
            }
            // Footnote definitions, metadata blocks: open a paragraph so any
            // inner text doesn't crash; on End we fold into the doc.
            Tag::FootnoteDefinition(_) | Tag::MetadataBlock(_) | Tag::HtmlBlock => {
                self.push_frame(FrameKind::Paragraph);
            }
            Tag::DefinitionList | Tag::DefinitionListTitle | Tag::DefinitionListDefinition => {
                self.push_frame(FrameKind::Paragraph);
            }
            Tag::Subscript | Tag::Superscript => {
                // No ADF mark for sub/super in our supported set — drop the
                // wrapper, keep children as plain text.
            }
        }
    }

    fn end(&mut self, tag: TagEnd) {
        match tag {
            TagEnd::Paragraph => self.pop_into_block("paragraph", None),
            TagEnd::Heading(level) => {
                let lvl = heading_level_to_u8(level);
                self.pop_into_block("heading", Some(json!({ "level": lvl })));
            }
            TagEnd::BlockQuote(_) => self.pop_into_block("blockquote", None),
            TagEnd::CodeBlock => self.pop_code_block(),
            TagEnd::List(_) => self.pop_list(),
            TagEnd::Item => self.pop_list_item(),
            TagEnd::Table => self.pop_table(),
            TagEnd::TableHead | TagEnd::TableRow => self.pop_table_row(),
            TagEnd::TableCell => self.pop_table_cell(),
            TagEnd::Emphasis | TagEnd::Strong | TagEnd::Strikethrough | TagEnd::Link => {
                self.marks.pop();
            }
            TagEnd::Image => {
                let frame = self.stack.pop().expect("image frame");
                let url = match &frame.kind {
                    FrameKind::Image { url } => url.clone(),
                    _ => String::new(),
                };
                let alt = frame
                    .content
                    .iter()
                    .filter_map(|n| n.get("text").and_then(|t| t.as_str()))
                    .collect::<String>();
                if !url.is_empty() {
                    self.push_inline(json!({
                        "type": "mediaInline",
                        "attrs": { "url": url, "alt": alt },
                    }));
                } else if !alt.is_empty() {
                    self.add_text(&alt);
                }
            }
            TagEnd::FootnoteDefinition
            | TagEnd::MetadataBlock(_)
            | TagEnd::HtmlBlock
            | TagEnd::DefinitionList
            | TagEnd::DefinitionListTitle
            | TagEnd::DefinitionListDefinition => {
                // Treat as paragraph close.
                self.pop_into_block("paragraph", None);
            }
            TagEnd::Subscript | TagEnd::Superscript => {
                // Matches the Start side — no-op.
            }
        }
    }

    fn push_frame(&mut self, kind: FrameKind) {
        self.stack.push(Frame {
            kind,
            content: Vec::new(),
        });
    }

    fn pop_into_block(&mut self, ty: &str, attrs: Option<Value>) {
        let frame = self.stack.pop().expect("frame for block");
        let mut node = json!({ "type": ty, "content": frame.content });
        if let Some(a) = attrs {
            node["attrs"] = a;
        }
        self.push_block(node);
    }

    fn pop_code_block(&mut self) {
        let frame = self.stack.pop().expect("code block frame");
        let (lang, text) = match frame.kind {
            FrameKind::CodeBlock { lang, text } => (lang, text),
            _ => unreachable!("non-codeblock frame on codeblock end"),
        };
        // pulldown_cmark always ends fenced code blocks with a trailing \n
        // even when the source didn't — strip one to keep the round-trip
        // clean.
        let trimmed = text.strip_suffix('\n').unwrap_or(&text).to_string();
        let mut node = json!({
            "type": "codeBlock",
            "content": [{ "type": "text", "text": trimmed }],
        });
        if let Some(l) = lang {
            node["attrs"] = json!({ "language": l });
        } else {
            node["attrs"] = json!({});
        }
        // If text is empty, drop the empty text node — ADF prefers no
        // children over an empty text child.
        if trimmed.is_empty() {
            node["content"] = json!([]);
        }
        self.push_block(node);
    }

    fn pop_list(&mut self) {
        let frame = self.stack.pop().expect("list frame");
        // Determine whether this is a task list — true iff every child item is
        // a task item.
        let is_task = !frame.content.is_empty()
            && frame
                .content
                .iter()
                .all(|item| node_type(item) == Some("taskItem"));
        let list_type = if is_task {
            "taskList"
        } else {
            match &frame.kind {
                FrameKind::OrderedList { .. } => "orderedList",
                _ => "bulletList",
            }
        };
        let mut node = json!({ "type": list_type, "content": frame.content });
        if let FrameKind::OrderedList { start } = frame.kind {
            if !is_task && start != 1 {
                node["attrs"] = json!({ "order": start });
            }
        }
        self.push_block(node);
    }

    fn pop_list_item(&mut self) {
        let frame = self.stack.pop().expect("list item frame");
        match frame.kind {
            FrameKind::ListItem {
                task: Some(checked),
            } => {
                // Task items take inline content directly. Unwrap the inner
                // paragraph(s) into the taskItem's content.
                let mut inline: Vec<Value> = Vec::new();
                for child in frame.content {
                    if node_type(&child) == Some("paragraph") {
                        if let Some(arr) = child.get("content").and_then(|c| c.as_array()) {
                            inline.extend(arr.iter().cloned());
                        }
                    } else {
                        inline.push(child);
                    }
                }
                let state = if checked { "DONE" } else { "TODO" };
                self.push_block(json!({
                    "type": "taskItem",
                    "attrs": { "state": state },
                    "content": inline,
                }));
            }
            _ => {
                // ADF list items contain block-level content. pulldown emits
                // tight lists as bare inline events (no Paragraph wrapper);
                // group any leading inline nodes into a paragraph.
                let content = wrap_loose_inline_in_paragraph(frame.content);
                self.push_block(json!({
                    "type": "listItem",
                    "content": content,
                }));
            }
        }
    }

    fn pop_table(&mut self) {
        let frame = self.stack.pop().expect("table frame");
        self.push_block(json!({
            "type": "table",
            "content": frame.content,
        }));
    }

    fn pop_table_row(&mut self) {
        let frame = self.stack.pop().expect("table row frame");
        self.push_block(json!({
            "type": "tableRow",
            "content": frame.content,
        }));
    }

    fn pop_table_cell(&mut self) {
        let frame = self.stack.pop().expect("table cell frame");
        let is_header = matches!(frame.kind, FrameKind::TableCell { is_header: true });
        // Wrap cell inline content in a paragraph (ADF table cells contain
        // blocks).
        let para = json!({
            "type": "paragraph",
            "content": frame.content,
        });
        let ty = if is_header {
            "tableHeader"
        } else {
            "tableCell"
        };
        self.push_block(json!({
            "type": ty,
            "attrs": {},
            "content": [para],
        }));
    }

    fn finish(mut self) -> Value {
        // Close any unbalanced frames by folding them into the doc as plain
        // paragraphs — defensive guard, malformed markdown should not panic.
        // Drop any unbalanced inline marks so they don't leak onto folded
        // text nodes as bogus ADF marks.
        self.marks.clear();
        while self.stack.len() > 1 {
            let f = self.stack.pop().unwrap();
            let content = match f.kind {
                FrameKind::Image { url } => {
                    // Salvage as a mediaInline if we have a url, else fall
                    // through to a plain paragraph of the alt text.
                    let alt = f
                        .content
                        .iter()
                        .filter_map(|n| n.get("text").and_then(|t| t.as_str()))
                        .collect::<String>();
                    if !url.is_empty() {
                        vec![json!({
                            "type": "mediaInline",
                            "attrs": { "url": url, "alt": alt },
                        })]
                    } else if !alt.is_empty() {
                        vec![json!({ "type": "text", "text": alt })]
                    } else {
                        f.content
                    }
                }
                _ => f.content,
            };
            let node = json!({ "type": "paragraph", "content": content });
            self.top_mut().content.push(node);
        }
        let doc = self.stack.pop().expect("doc frame");
        json!({
            "version": 1,
            "type": "doc",
            "content": doc.content,
        })
    }
}

fn wrap_loose_inline_in_paragraph(nodes: Vec<Value>) -> Vec<Value> {
    let mut out: Vec<Value> = Vec::new();
    let mut buf: Vec<Value> = Vec::new();
    let flush = |buf: &mut Vec<Value>, out: &mut Vec<Value>| {
        if !buf.is_empty() {
            out.push(json!({
                "type": "paragraph",
                "content": std::mem::take(buf),
            }));
        }
    };
    for node in nodes {
        if is_block_node(&node) {
            flush(&mut buf, &mut out);
            out.push(node);
        } else {
            buf.push(node);
        }
    }
    flush(&mut buf, &mut out);
    out
}

fn is_block_node(v: &Value) -> bool {
    matches!(
        node_type(v),
        Some(
            "paragraph"
                | "heading"
                | "bulletList"
                | "orderedList"
                | "taskList"
                | "listItem"
                | "taskItem"
                | "codeBlock"
                | "blockquote"
                | "rule"
                | "table"
                | "tableRow"
                | "tableCell"
                | "tableHeader"
        )
    )
}

fn heading_level_to_u8(level: HeadingLevel) -> u8 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn doc(children: Value) -> Value {
        json!({ "version": 1, "type": "doc", "content": children })
    }

    // ---------- to_markdown: block nodes ----------

    #[test]
    fn to_md_paragraph_plain_text() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "Hello world" }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "Hello world\n");
    }

    #[test]
    fn to_md_heading_level_2() {
        let adf = doc(json!([
            { "type": "heading", "attrs": { "level": 2 },
              "content": [{ "type": "text", "text": "Section" }] }
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "## Section\n");
    }

    #[test]
    fn to_md_bullet_list_three_items() {
        let adf = doc(json!([
            { "type": "bulletList", "content": [
                { "type": "listItem", "content": [
                    { "type": "paragraph",
                      "content": [{ "type": "text", "text": "a" }] }
                ]},
                { "type": "listItem", "content": [
                    { "type": "paragraph",
                      "content": [{ "type": "text", "text": "b" }] }
                ]},
                { "type": "listItem", "content": [
                    { "type": "paragraph",
                      "content": [{ "type": "text", "text": "c" }] }
                ]}
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "- a\n- b\n- c\n");
    }

    #[test]
    fn to_md_ordered_list() {
        let adf = doc(json!([
            { "type": "orderedList", "content": [
                { "type": "listItem", "content": [
                    { "type": "paragraph",
                      "content": [{ "type": "text", "text": "a" }] }
                ]},
                { "type": "listItem", "content": [
                    { "type": "paragraph",
                      "content": [{ "type": "text", "text": "b" }] }
                ]}
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "1. a\n2. b\n");
    }

    #[test]
    fn to_md_code_block_with_language() {
        let adf = doc(json!([
            { "type": "codeBlock", "attrs": { "language": "rust" },
              "content": [{ "type": "text", "text": "fn main() {}" }] }
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "```rust\nfn main() {}\n```\n");
    }

    #[test]
    fn to_md_task_list_with_states() {
        let adf = doc(json!([
            { "type": "taskList", "content": [
                { "type": "taskItem", "attrs": { "state": "DONE" },
                  "content": [{ "type": "text", "text": "done" }] },
                { "type": "taskItem", "attrs": { "state": "TODO" },
                  "content": [{ "type": "text", "text": "todo" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "- [x] done\n- [ ] todo\n");
    }

    #[test]
    fn to_md_blockquote() {
        let adf = doc(json!([
            { "type": "blockquote", "content": [
                { "type": "paragraph",
                  "content": [{ "type": "text", "text": "quoted" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "> quoted\n");
    }

    #[test]
    fn to_md_rule() {
        let adf = doc(json!([{ "type": "rule" }]));
        assert_eq!(to_markdown(&adf).unwrap(), "---\n");
    }

    #[test]
    fn to_md_table_2x2_with_header() {
        let adf = doc(json!([
            { "type": "table", "content": [
                { "type": "tableRow", "content": [
                    { "type": "tableHeader", "content": [
                        { "type": "paragraph",
                          "content": [{ "type": "text", "text": "h1" }] } ]},
                    { "type": "tableHeader", "content": [
                        { "type": "paragraph",
                          "content": [{ "type": "text", "text": "h2" }] } ]}
                ]},
                { "type": "tableRow", "content": [
                    { "type": "tableCell", "content": [
                        { "type": "paragraph",
                          "content": [{ "type": "text", "text": "a" }] } ]},
                    { "type": "tableCell", "content": [
                        { "type": "paragraph",
                          "content": [{ "type": "text", "text": "b" }] } ]}
                ]}
            ]}
        ]));
        let md = to_markdown(&adf).unwrap();
        assert_eq!(md, "| h1 | h2 |\n| --- | --- |\n| a | b |\n");
    }

    // ---------- to_markdown: inline marks ----------

    #[test]
    fn to_md_strong_mark() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "bold",
                  "marks": [{ "type": "strong" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "**bold**\n");
    }

    #[test]
    fn to_md_em_mark() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "italic",
                  "marks": [{ "type": "em" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "_italic_\n");
    }

    #[test]
    fn to_md_code_mark() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "x",
                  "marks": [{ "type": "code" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "`x`\n");
    }

    #[test]
    fn to_md_link_mark() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "text",
                  "marks": [{ "type": "link",
                              "attrs": { "href": "https://example.com" } }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "[text](https://example.com)\n");
    }

    #[test]
    fn to_md_strike_mark() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "gone",
                  "marks": [{ "type": "strike" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "~~gone~~\n");
    }

    #[test]
    fn to_md_underline_dropped() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "plain",
                  "marks": [{ "type": "underline" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "plain\n");
    }

    #[test]
    fn to_md_combined_marks() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "x",
                  "marks": [{ "type": "strong" }, { "type": "em" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "**_x_**\n");
    }

    // ---------- to_markdown: special inline nodes ----------

    #[test]
    fn to_md_mention_with_display_text() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "mention", "attrs": { "id": "u1", "text": "@Alice" } }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "@Alice\n");
    }

    #[test]
    fn to_md_mention_fallback_to_id() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "mention", "attrs": { "id": "u1" } }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "@u1\n");
    }

    #[test]
    fn to_md_emoji() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "emoji", "attrs": { "shortName": ":smile:" } }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), ":smile:\n");
    }

    #[test]
    fn to_md_inline_card() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "inlineCard",
                  "attrs": { "url": "https://example.com" } }
            ]}
        ]));
        assert_eq!(
            to_markdown(&adf).unwrap(),
            "[https://example.com](https://example.com)\n"
        );
    }

    // ---------- to_markdown: edge cases ----------

    #[test]
    fn to_md_empty_doc() {
        let adf = doc(json!([]));
        assert_eq!(to_markdown(&adf).unwrap(), "");
    }

    #[test]
    fn to_md_invalid_root_errors() {
        let bad = json!({ "type": "paragraph" });
        assert!(matches!(
            to_markdown(&bad),
            Err(AdfError::InvalidStructure(_))
        ));
    }

    #[test]
    fn to_md_missing_type_errors() {
        let bad = json!({ "content": [] });
        assert!(matches!(
            to_markdown(&bad),
            Err(AdfError::InvalidStructure(_))
        ));
    }

    #[test]
    fn to_md_unknown_block_falls_back_no_panic() {
        let adf = doc(json!([
            { "type": "panel", "content": [
                { "type": "paragraph", "content": [
                    { "type": "text", "text": "info" }
                ]}
            ]}
        ]));
        let md = to_markdown(&adf).unwrap();
        assert!(md.contains("info"), "got: {md}");
        assert!(md.contains("adf:panel"), "got: {md}");
    }

    #[test]
    fn to_md_escapes_markdown_metacharacters_in_plain_text() {
        // Text like `*foo*` would be re-parsed as emphasis on round-trip
        // unless we escape it.
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "literal *star* and _under_ and [bracket]" }
            ]}
        ]));
        let md = to_markdown(&adf).unwrap();
        assert_eq!(md, "literal \\*star\\* and \\_under\\_ and \\[bracket\\]\n");
        // And it round-trips back to the same text.
        let adf2 = from_markdown(&md);
        assert_eq!(
            collect_text(&adf2),
            "literal *star* and _under_ and [bracket]"
        );
    }

    #[test]
    fn to_md_escapes_inside_strong_mark() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "a*b",
                  "marks": [{ "type": "strong" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "**a\\*b**\n");
    }

    #[test]
    fn to_md_code_span_widens_backtick_delimiter_when_text_has_backticks() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "a`b",
                  "marks": [{ "type": "code" }] }
            ]}
        ]));
        // Single backtick can't be used; converter picks two backticks.
        assert_eq!(to_markdown(&adf).unwrap(), "``a`b``\n");
    }

    #[test]
    fn to_md_code_span_pads_when_text_starts_or_ends_with_backtick() {
        let adf = doc(json!([
            { "type": "paragraph", "content": [
                { "type": "text", "text": "`x",
                  "marks": [{ "type": "code" }] }
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "`` `x ``\n");
    }

    #[test]
    fn to_md_unknown_block_sanitizes_type_against_html_comment_injection() {
        // A node type with `-->` or HTML metacharacters would otherwise
        // break out of the fallback comment marker.
        let adf = doc(json!([
            { "type": "evil--><script>", "content": [
                { "type": "text", "text": "payload" }
            ]}
        ]));
        let md = to_markdown(&adf).unwrap();
        assert!(
            !md.contains("-->\n<script>"),
            "comment terminator must be sanitized: {md}"
        );
        assert!(md.contains("payload"));
    }

    #[test]
    fn from_md_soft_break_becomes_hard_break() {
        // A wrapped paragraph: pulldown emits a SoftBreak between lines.
        let v = from_markdown("line one\nline two");
        let inline = v["content"][0]["content"].as_array().unwrap();
        // Expect: text "line one", hardBreak, text "line two"
        assert_eq!(inline[0]["text"], "line one");
        assert_eq!(inline[1]["type"], "hardBreak");
        assert_eq!(inline[2]["text"], "line two");
    }

    #[test]
    fn from_md_image_uses_dedicated_frame() {
        let v = from_markdown("![alt text](https://example.com/x.png)");
        let inline = v["content"][0]["content"].as_array().unwrap();
        let media = inline.iter().find(|n| n["type"] == "mediaInline").unwrap();
        assert_eq!(media["attrs"]["url"], "https://example.com/x.png");
        assert_eq!(media["attrs"]["alt"], "alt text");
        // The synthetic __image_url mark must not leak onto any text node.
        for n in inline {
            if let Some(marks) = n.get("marks").and_then(|m| m.as_array()) {
                for m in marks {
                    assert_ne!(
                        m["type"], "__image_url",
                        "synthetic mark leaked into output: {v}"
                    );
                }
            }
        }
    }

    #[test]
    fn to_md_list_item_with_multiple_paragraphs() {
        // ADF list item containing two paragraphs — CommonMark needs a blank
        // line between them, and the blank line must carry the continuation
        // prefix (here: nothing, just empty) without ending the item.
        let adf = doc(json!([
            { "type": "bulletList", "content": [
                { "type": "listItem", "content": [
                    { "type": "paragraph",
                      "content": [{ "type": "text", "text": "first" }] },
                    { "type": "paragraph",
                      "content": [{ "type": "text", "text": "second" }] }
                ]}
            ]}
        ]));
        let md = to_markdown(&adf).unwrap();
        // Re-parse and confirm both paragraphs remain inside one list item.
        let parsed = from_markdown(&md);
        let list = &parsed["content"][0];
        assert_eq!(list["type"], "bulletList");
        let items = list["content"].as_array().unwrap();
        assert_eq!(items.len(), 1, "got: {md:?}\n parsed: {parsed}");
        let inner = items[0]["content"].as_array().unwrap();
        let paragraphs: Vec<_> = inner.iter().filter(|n| n["type"] == "paragraph").collect();
        assert_eq!(
            paragraphs.len(),
            2,
            "expected two paragraphs in item, got: {md:?}\n parsed: {parsed}"
        );
    }

    #[test]
    fn to_md_nested_bullet_lists() {
        let adf = doc(json!([
            { "type": "bulletList", "content": [
                { "type": "listItem", "content": [
                    { "type": "paragraph",
                      "content": [{ "type": "text", "text": "outer" }] },
                    { "type": "bulletList", "content": [
                        { "type": "listItem", "content": [
                            { "type": "paragraph",
                              "content": [{ "type": "text", "text": "inner" }] }
                        ]}
                    ]}
                ]}
            ]}
        ]));
        assert_eq!(to_markdown(&adf).unwrap(), "- outer\n  - inner\n");
    }

    // ---------- from_markdown ----------

    #[test]
    fn from_md_simple_paragraph() {
        let v = from_markdown("Hello world");
        assert_eq!(v["type"], "doc");
        assert_eq!(v["content"][0]["type"], "paragraph");
        assert_eq!(v["content"][0]["content"][0]["text"], "Hello world");
    }

    #[test]
    fn from_md_heading_then_paragraph() {
        let v = from_markdown("# Title\n\nParagraph");
        assert_eq!(v["content"][0]["type"], "heading");
        assert_eq!(v["content"][0]["attrs"]["level"], 1);
        assert_eq!(v["content"][0]["content"][0]["text"], "Title");
        assert_eq!(v["content"][1]["type"], "paragraph");
        assert_eq!(v["content"][1]["content"][0]["text"], "Paragraph");
    }

    #[test]
    fn from_md_bullet_list() {
        let v = from_markdown("- a\n- b\n- c");
        assert_eq!(v["content"][0]["type"], "bulletList");
        let items = v["content"][0]["content"].as_array().unwrap();
        assert_eq!(items.len(), 3);
        assert_eq!(items[0]["type"], "listItem");
    }

    #[test]
    fn from_md_ordered_list() {
        let v = from_markdown("1. a\n2. b");
        assert_eq!(v["content"][0]["type"], "orderedList");
        let items = v["content"][0]["content"].as_array().unwrap();
        assert_eq!(items.len(), 2);
    }

    #[test]
    fn from_md_task_list() {
        let v = from_markdown("- [x] done\n- [ ] todo");
        assert_eq!(v["content"][0]["type"], "taskList");
        let items = v["content"][0]["content"].as_array().unwrap();
        assert_eq!(items[0]["type"], "taskItem");
        assert_eq!(items[0]["attrs"]["state"], "DONE");
        assert_eq!(items[1]["attrs"]["state"], "TODO");
    }

    #[test]
    fn from_md_fenced_code_block() {
        let v = from_markdown("```rust\nfn main() {}\n```");
        let cb = &v["content"][0];
        assert_eq!(cb["type"], "codeBlock");
        assert_eq!(cb["attrs"]["language"], "rust");
        assert_eq!(cb["content"][0]["text"], "fn main() {}");
    }

    #[test]
    fn from_md_inline_marks() {
        let v = from_markdown("**bold** and _italic_ and `code`");
        let para = &v["content"][0];
        let inline = para["content"].as_array().unwrap();
        // bold
        assert_eq!(inline[0]["text"], "bold");
        assert_eq!(inline[0]["marks"][0]["type"], "strong");
        // " and "
        assert_eq!(inline[1]["text"], " and ");
        // italic
        assert_eq!(inline[2]["text"], "italic");
        assert_eq!(inline[2]["marks"][0]["type"], "em");
        // code
        let code = inline.iter().find(|n| n["text"] == "code").unwrap();
        assert_eq!(code["marks"][0]["type"], "code");
    }

    #[test]
    fn from_md_link() {
        let v = from_markdown("[text](https://example.com)");
        let inline = v["content"][0]["content"].as_array().unwrap();
        assert_eq!(inline[0]["text"], "text");
        assert_eq!(inline[0]["marks"][0]["type"], "link");
        assert_eq!(
            inline[0]["marks"][0]["attrs"]["href"],
            "https://example.com"
        );
    }

    #[test]
    fn from_md_strikethrough() {
        let v = from_markdown("~~gone~~");
        let inline = v["content"][0]["content"].as_array().unwrap();
        assert_eq!(inline[0]["text"], "gone");
        assert_eq!(inline[0]["marks"][0]["type"], "strike");
    }

    #[test]
    fn from_md_blockquote() {
        let v = from_markdown("> quoted");
        let bq = &v["content"][0];
        assert_eq!(bq["type"], "blockquote");
        assert_eq!(bq["content"][0]["type"], "paragraph");
        assert_eq!(bq["content"][0]["content"][0]["text"], "quoted");
    }

    #[test]
    fn from_md_rule() {
        let v = from_markdown("---");
        assert_eq!(v["content"][0]["type"], "rule");
    }

    #[test]
    fn from_md_table() {
        let md = "| h1 | h2 |\n| --- | --- |\n| a | b |";
        let v = from_markdown(md);
        let t = &v["content"][0];
        assert_eq!(t["type"], "table");
        let rows = t["content"].as_array().unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0]["content"][0]["type"], "tableHeader");
        assert_eq!(rows[1]["content"][0]["type"], "tableCell");
    }

    #[test]
    fn from_md_returns_valid_doc_structure() {
        let v = from_markdown("# Title\n\nParagraph");
        assert_eq!(v["type"], "doc");
        assert_eq!(v["version"], 1);
        assert!(v["content"].is_array());
    }

    #[test]
    fn from_md_empty_string() {
        let v = from_markdown("");
        assert_eq!(v["type"], "doc");
        assert_eq!(v["content"].as_array().unwrap().len(), 0);
    }

    // ---------- round-trip ----------

    fn collect_doc_text(v: &Value) -> String {
        super::collect_text(v)
    }

    #[test]
    fn round_trip_preserves_text_content() {
        let inputs = [
            "Hello world",
            "# Title\n\nParagraph",
            "- a\n- b\n- c",
            "1. one\n2. two",
            "- [x] done\n- [ ] todo",
            "**bold** and _italic_",
            "[a](https://example.com)",
            "```rust\nfn main() {}\n```",
            "> quoted",
            "| h1 | h2 |\n| --- | --- |\n| a | b |",
        ];
        for md in inputs {
            let adf = from_markdown(md);
            let md2 = to_markdown(&adf).expect("to_markdown");
            let adf2 = from_markdown(&md2);
            let t1 = collect_doc_text(&adf);
            let t2 = collect_doc_text(&adf2);
            assert_eq!(
                t1, t2,
                "round-trip text content mismatch for input {md:?}\n  md2: {md2:?}"
            );
        }
    }

    #[test]
    fn round_trip_via_adf_then_markdown() {
        let original = json!({
            "version": 1,
            "type": "doc",
            "content": [
                { "type": "heading", "attrs": { "level": 1 },
                  "content": [{ "type": "text", "text": "Title" }] },
                { "type": "paragraph", "content": [
                    { "type": "text", "text": "see " },
                    { "type": "text", "text": "this",
                      "marks": [{ "type": "link",
                                  "attrs": { "href": "https://x.com" } }] }
                ]}
            ]
        });
        let md = to_markdown(&original).unwrap();
        let parsed = from_markdown(&md);
        assert_eq!(collect_doc_text(&original), collect_doc_text(&parsed));
    }

    #[test]
    fn from_md_unknown_html_inline_becomes_text() {
        // Inline HTML degrades to plain text — no panic, no error.
        let v = from_markdown("a <span>b</span> c");
        // We don't enforce exact text shape here — just that the doc is valid.
        assert_eq!(v["type"], "doc");
        assert!(v["content"].is_array());
    }
}
