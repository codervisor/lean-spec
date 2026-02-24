pub fn levenshtein_distance(left: &str, right: &str) -> usize {
    if left == right {
        return 0;
    }

    if left.is_empty() {
        return right.chars().count();
    }

    if right.is_empty() {
        return left.chars().count();
    }

    let right_chars: Vec<char> = right.chars().collect();
    let mut previous: Vec<usize> = (0..=right_chars.len()).collect();
    let mut current: Vec<usize> = vec![0; right_chars.len() + 1];

    for (i, lc) in left.chars().enumerate() {
        current[0] = i + 1;
        for (j, rc) in right_chars.iter().enumerate() {
            let cost = if lc == *rc { 0 } else { 1 };
            current[j + 1] = std::cmp::min(
                std::cmp::min(current[j] + 1, previous[j + 1] + 1),
                previous[j] + cost,
            );
        }
        std::mem::swap(&mut previous, &mut current);
    }

    previous[right_chars.len()]
}

pub fn best_match_distance_in_text(text: &str, term: &str) -> Option<usize> {
    let mut best: Option<usize> = None;
    for token in tokenize(text) {
        if token.is_empty() {
            continue;
        }
        let distance = levenshtein_distance(&token, term);
        best = match best {
            Some(existing) if existing <= distance => Some(existing),
            _ => Some(distance),
        };
    }
    best
}

fn tokenize(text: &str) -> Vec<String> {
    text.to_ascii_lowercase()
        .split(|c: char| !c.is_alphanumeric() && c != '_' && c != '-')
        .filter(|t| !t.is_empty())
        .map(|t| t.to_string())
        .collect()
}
