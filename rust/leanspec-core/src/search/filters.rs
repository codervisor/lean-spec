use crate::SpecInfo;
use chrono::{Datelike, NaiveDate};

use super::query::QueryField;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DateOperator {
    Eq,
    Gt,
    Gte,
    Lt,
    Lte,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DateGranularity {
    Year,
    Month,
    Day,
}

pub fn matches_field(spec: &SpecInfo, field: QueryField, raw_value: &str) -> bool {
    match field {
        QueryField::Status => spec
            .frontmatter
            .status
            .to_string()
            .eq_ignore_ascii_case(raw_value),
        QueryField::Tag => spec.frontmatter.tags.iter().any(|tag| {
            tag.eq_ignore_ascii_case(raw_value) || tag.to_ascii_lowercase().contains(raw_value)
        }),
        QueryField::Priority => spec
            .frontmatter
            .priority
            .map(|p| p.to_string().eq_ignore_ascii_case(raw_value))
            .unwrap_or(false),
        QueryField::Title => spec.title.to_ascii_lowercase().contains(raw_value),
        QueryField::Created => matches_created_filter(&spec.frontmatter.created, raw_value),
    }
}

fn matches_created_filter(created: &str, raw_value: &str) -> bool {
    let (op, value) = parse_operator(raw_value);
    let Some((lower, upper)) = parse_date_range(value) else {
        return false;
    };

    let Some(spec_date) = parse_spec_date(created) else {
        return false;
    };

    match op {
        DateOperator::Eq => spec_date >= lower && spec_date <= upper,
        DateOperator::Gt => spec_date > upper,
        DateOperator::Gte => spec_date >= lower,
        DateOperator::Lt => spec_date < lower,
        DateOperator::Lte => spec_date <= upper,
    }
}

fn parse_operator(raw: &str) -> (DateOperator, &str) {
    if let Some(rest) = raw.strip_prefix(">=") {
        (DateOperator::Gte, rest)
    } else if let Some(rest) = raw.strip_prefix("<=") {
        (DateOperator::Lte, rest)
    } else if let Some(rest) = raw.strip_prefix('>') {
        (DateOperator::Gt, rest)
    } else if let Some(rest) = raw.strip_prefix('<') {
        (DateOperator::Lt, rest)
    } else if let Some(rest) = raw.strip_prefix('=') {
        (DateOperator::Eq, rest)
    } else {
        (DateOperator::Eq, raw)
    }
}

fn parse_spec_date(created: &str) -> Option<NaiveDate> {
    let created = created.trim();
    if created.len() >= 10 {
        NaiveDate::parse_from_str(&created[..10], "%Y-%m-%d").ok()
    } else {
        None
    }
}

fn parse_date_range(raw: &str) -> Option<(NaiveDate, NaiveDate)> {
    let raw = raw.trim();
    let (base, granularity) = parse_date_with_granularity(raw)?;

    match granularity {
        DateGranularity::Day => Some((base, base)),
        DateGranularity::Month => {
            let upper = last_day_of_month(base.year(), base.month())?;
            Some((base, upper))
        }
        DateGranularity::Year => {
            let lower = NaiveDate::from_ymd_opt(base.year(), 1, 1)?;
            let upper = NaiveDate::from_ymd_opt(base.year(), 12, 31)?;
            Some((lower, upper))
        }
    }
}

fn parse_date_with_granularity(raw: &str) -> Option<(NaiveDate, DateGranularity)> {
    let parts: Vec<&str> = raw.split('-').collect();
    match parts.len() {
        1 => {
            let year = parts[0].parse::<i32>().ok()?;
            let date = NaiveDate::from_ymd_opt(year, 1, 1)?;
            Some((date, DateGranularity::Year))
        }
        2 => {
            let year = parts[0].parse::<i32>().ok()?;
            let month = parts[1].parse::<u32>().ok()?;
            let date = NaiveDate::from_ymd_opt(year, month, 1)?;
            Some((date, DateGranularity::Month))
        }
        3 => {
            let year = parts[0].parse::<i32>().ok()?;
            let month = parts[1].parse::<u32>().ok()?;
            let day = parts[2].parse::<u32>().ok()?;
            let date = NaiveDate::from_ymd_opt(year, month, day)?;
            Some((date, DateGranularity::Day))
        }
        _ => None,
    }
}

fn last_day_of_month(year: i32, month: u32) -> Option<NaiveDate> {
    let (next_year, next_month) = if month == 12 {
        (year + 1, 1)
    } else {
        (year, month + 1)
    };

    let first_of_next = NaiveDate::from_ymd_opt(next_year, next_month, 1)?;
    first_of_next.pred_opt()
}
