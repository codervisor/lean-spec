use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogicalConnector {
    And,
    Or,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QueryField {
    Status,
    Tag,
    Priority,
    Created,
    Title,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QueryTerm {
    Word { value: String, fuzzy: Option<usize> },
    Phrase { value: String },
    Field { field: QueryField, value: String },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QueryClause {
    pub connector: LogicalConnector,
    pub negated: bool,
    pub term: QueryTerm,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedQuery {
    pub clauses: Vec<QueryClause>,
    pub text_terms: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchQueryError(pub String);

impl fmt::Display for SearchQueryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for SearchQueryError {}

#[derive(Debug, Clone, PartialEq, Eq)]
enum Token {
    Raw(String),
    Phrase(String),
}

pub fn validate_search_query(query: &str) -> Result<(), SearchQueryError> {
    parse_query(query).map(|_| ())
}

pub fn parse_query(query: &str) -> Result<ParsedQuery, SearchQueryError> {
    let tokens = tokenize(query)?;
    parse_tokens(tokens)
}

pub fn parse_query_terms(query: &str) -> Vec<String> {
    if let Ok(parsed) = parse_query(query) {
        return parsed.text_terms;
    }

    query
        .split_whitespace()
        .filter_map(|t| {
            let upper = t.to_ascii_uppercase();
            if upper == "AND" || upper == "OR" || upper == "NOT" || t.contains(':') {
                None
            } else {
                Some(t.to_lowercase())
            }
        })
        .collect()
}

fn tokenize(query: &str) -> Result<Vec<Token>, SearchQueryError> {
    let mut chars = query.chars().peekable();
    let mut tokens = Vec::new();
    let mut current = String::new();

    while let Some(ch) = chars.next() {
        match ch {
            '"' => {
                if !current.trim().is_empty() {
                    tokens.push(Token::Raw(current.trim().to_string()));
                    current.clear();
                }

                let mut phrase = String::new();
                let mut closed = false;
                for c in chars.by_ref() {
                    if c == '"' {
                        closed = true;
                        break;
                    }
                    phrase.push(c);
                }

                if !closed {
                    return Err(SearchQueryError("Unterminated quote in query".to_string()));
                }

                let phrase = phrase.trim();
                if phrase.is_empty() {
                    return Err(SearchQueryError(
                        "Empty quoted phrase is not allowed".to_string(),
                    ));
                }
                tokens.push(Token::Phrase(phrase.to_lowercase()));
            }
            c if c.is_whitespace() => {
                if !current.trim().is_empty() {
                    tokens.push(Token::Raw(current.trim().to_string()));
                    current.clear();
                }
            }
            _ => current.push(ch),
        }
    }

    if !current.trim().is_empty() {
        tokens.push(Token::Raw(current.trim().to_string()));
    }

    if tokens.is_empty() {
        return Err(SearchQueryError("Empty search query".to_string()));
    }

    Ok(tokens)
}

fn parse_tokens(tokens: Vec<Token>) -> Result<ParsedQuery, SearchQueryError> {
    let mut clauses: Vec<QueryClause> = Vec::new();
    let mut text_terms: Vec<String> = Vec::new();

    let mut connector = LogicalConnector::And;
    let mut negated = false;
    let mut expect_term = true;

    for token in tokens {
        match token {
            Token::Raw(raw) => {
                let upper = raw.to_ascii_uppercase();

                if upper == "AND" || upper == "OR" {
                    if expect_term {
                        return Err(SearchQueryError(format!("Unexpected operator '{}'", raw)));
                    }

                    connector = if upper == "OR" {
                        LogicalConnector::Or
                    } else {
                        LogicalConnector::And
                    };
                    expect_term = true;
                    continue;
                }

                if upper == "NOT" {
                    if !expect_term {
                        connector = LogicalConnector::And;
                    }
                    negated = !negated;
                    expect_term = true;
                    continue;
                }

                let term = parse_term(&raw)?;
                add_text_terms(&mut text_terms, &term);
                clauses.push(QueryClause {
                    connector,
                    negated,
                    term,
                });

                connector = LogicalConnector::And;
                negated = false;
                expect_term = false;
            }
            Token::Phrase(phrase) => {
                let term = QueryTerm::Phrase {
                    value: phrase.clone(),
                };
                text_terms.push(phrase);
                clauses.push(QueryClause {
                    connector,
                    negated,
                    term,
                });

                connector = LogicalConnector::And;
                negated = false;
                expect_term = false;
            }
        }
    }

    if expect_term {
        return Err(SearchQueryError("Query ends with an operator".to_string()));
    }

    if clauses.is_empty() {
        return Err(SearchQueryError("Empty search query".to_string()));
    }

    Ok(ParsedQuery {
        clauses,
        text_terms,
    })
}

fn add_text_terms(text_terms: &mut Vec<String>, term: &QueryTerm) {
    match term {
        QueryTerm::Word { value, .. } => text_terms.push(value.clone()),
        QueryTerm::Phrase { value } => text_terms.push(value.clone()),
        QueryTerm::Field {
            field: QueryField::Title,
            value,
        } => text_terms.push(value.clone()),
        QueryTerm::Field { .. } => {}
    }
}

fn parse_term(raw: &str) -> Result<QueryTerm, SearchQueryError> {
    if let Some((field, value)) = raw.split_once(':') {
        let key = field.to_ascii_lowercase();
        let value = value.trim().to_ascii_lowercase();
        if value.is_empty() {
            return Err(SearchQueryError(format!(
                "Missing value for field '{}:'",
                field
            )));
        }

        let field = match key.as_str() {
            "status" => QueryField::Status,
            "tag" => QueryField::Tag,
            "priority" => QueryField::Priority,
            "created" => QueryField::Created,
            "title" => QueryField::Title,
            _ => return Err(SearchQueryError(format!("Unknown field '{}:'", field))),
        };

        return Ok(QueryTerm::Field { field, value });
    }

    let lower = raw.to_ascii_lowercase();
    let (value, fuzzy) = parse_fuzzy(&lower)?;
    Ok(QueryTerm::Word { value, fuzzy })
}

fn parse_fuzzy(raw: &str) -> Result<(String, Option<usize>), SearchQueryError> {
    if !raw.contains('~') {
        return Ok((raw.to_string(), None));
    }

    let Some(idx) = raw.rfind('~') else {
        return Ok((raw.to_string(), None));
    };

    let base = raw[..idx].trim();
    if base.is_empty() {
        return Err(SearchQueryError("Invalid fuzzy token".to_string()));
    }

    let threshold = if idx + 1 >= raw.len() {
        1
    } else {
        raw[idx + 1..]
            .parse::<usize>()
            .map_err(|_| SearchQueryError("Invalid fuzzy threshold; expected number".to_string()))?
    };

    Ok((base.to_string(), Some(threshold)))
}
