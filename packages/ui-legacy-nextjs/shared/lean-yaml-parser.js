const INDENT_SIZE = 2;

/**
 * Tokenize a simplified YAML document into indentation-aware tokens.
 * Only supports structures produced by LeanSpec configs (objects + arrays).
 * @param {string} source
 * @returns {{ indent: number; text: string; line: number; }[]}
 */
function tokenize(source) {
  return source
    .split(/\r?\n/)
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return null;
      }

      const indent = line.length - line.trimStart().length;
      if (indent % INDENT_SIZE !== 0) {
        throw new Error(`Invalid indentation on line ${index + 1}`);
      }

      return {
        indent,
        text: trimmed,
        line: index + 1,
      };
    })
    .filter((token) => token !== null);
}

function parseScalar(text) {
  if (text === '~' || text === 'null') {
    return null;
  }
  if (text === 'true' || text === 'false') {
    return text === 'true';
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }

  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(1, -1);
    }
  }

  return text;
}

function splitKeyValue(text, line) {
  const colonIndex = text.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Expected ':' in mapping on line ${line}`);
  }

  const key = text.slice(0, colonIndex).trim();
  const remainder = text.slice(colonIndex + 1).trim();

  return {
    key,
    hasValue: remainder.length > 0,
    value: remainder,
  };
}

function parseObjectProperties(tokens, state, indent, target) {
  while (state.index < tokens.length) {
    const token = tokens[state.index];
    if (token.indent < indent) {
      break;
    }
    if (token.indent > indent) {
      throw new Error(`Invalid indentation on line ${token.line}`);
    }
    if (token.text.startsWith('- ')) {
      break;
    }

    const { key, hasValue, value } = splitKeyValue(token.text, token.line);
    state.index += 1;

    if (hasValue) {
      target[key] = parseScalar(value);
    } else {
      target[key] = parseValue(tokens, state, indent + INDENT_SIZE);
    }
  }
}

function parseArray(tokens, state, indent) {
  const items = [];

  while (state.index < tokens.length) {
    const token = tokens[state.index];
    if (token.indent !== indent || !token.text.startsWith('- ')) {
      break;
    }

    const remainder = token.text.slice(2).trim();
    state.index += 1;

    if (!remainder) {
      const value = parseValue(tokens, state, indent + INDENT_SIZE);
      items.push(value ?? null);
      continue;
    }

    if (remainder.includes(':')) {
      const { key, hasValue, value } = splitKeyValue(remainder, token.line);
      const entry = {};

      if (hasValue) {
        entry[key] = parseScalar(value);
      } else {
        entry[key] = parseValue(tokens, state, indent + INDENT_SIZE);
      }

      parseObjectProperties(tokens, state, indent + INDENT_SIZE, entry);
      items.push(entry);
      continue;
    }

    items.push(parseScalar(remainder));
  }

  return items;
}

function parseObject(tokens, state, indent) {
  const result = {};

  while (state.index < tokens.length) {
    const token = tokens[state.index];
    if (token.indent < indent) {
      break;
    }
    if (token.indent > indent) {
      throw new Error(`Invalid indentation on line ${token.line}`);
    }
    if (token.text.startsWith('- ')) {
      throw new Error(`Unexpected list item on line ${token.line}`);
    }

    const { key, hasValue, value } = splitKeyValue(token.text, token.line);
    state.index += 1;

    if (hasValue) {
      result[key] = parseScalar(value);
    } else {
      result[key] = parseValue(tokens, state, indent + INDENT_SIZE);
    }
  }

  return result;
}

function parseValue(tokens, state, indent) {
  if (state.index >= tokens.length) {
    return null;
  }

  const token = tokens[state.index];
  if (token.indent < indent) {
    return null;
  }
  if (token.indent > indent) {
    throw new Error(`Invalid indentation on line ${token.line}`);
  }

  if (token.text.startsWith('- ')) {
    return parseArray(tokens, state, indent);
  }

  return parseObject(tokens, state, indent);
}

export function parseLeanYaml(source) {
  const tokens = tokenize(source);
  if (tokens.length === 0) {
    return {};
  }

  const state = { index: 0 };
  const value = parseValue(tokens, state, 0);

  if (state.index < tokens.length) {
    const next = tokens[state.index];
    throw new Error(`Unable to parse YAML near line ${next.line}`);
  }

  return value ?? {};
}

export default parseLeanYaml;
