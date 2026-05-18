//! Reusable compliance test suite that every [`Adapter`](super::Adapter)
//! implementation must satisfy.
//!
//! The harness exercises the behavioural contract: schema consistency, CRUD
//! round-trip, list / filter, search, optional links, and the standard error
//! cases. An adapter that returns wrong data on `get()` after `create()` —
//! or that maps `delete(nonexistent)` to the wrong error variant — fails
//! the relevant compliance test, so backends stay in lock-step over time.
//!
//! ## Usage
//!
//! The macro form generates one `#[test]` per category, so each case shows
//! up individually in `cargo test` output:
//!
//! ```rust,ignore
//! use leanspec_core::adapter_compliance_tests;
//! use leanspec_core::adapters::test_harness::ComplianceOptions;
//!
//! fn make_adapter() -> (MyAdapter, MyFixture) {
//!     // …
//! }
//!
//! adapter_compliance_tests!(make_adapter, ComplianceOptions::default());
//! ```
//!
//! Or call [`run_compliance_suite`] directly to run every case sequentially
//! against a single adapter instance.
//!
//! ## Skippable contract points
//!
//! Not every adapter supports every operation the same way. Use
//! [`ComplianceOptions`] to opt out of contract points that can't hold for a
//! given backend (e.g. hard-delete vs soft archive, link support).

use std::collections::HashMap;

use super::{Adapter, AdapterError, ListFilter, SearchOptions};
use crate::model::{semantic, CreateRequest, FieldKind, FieldValue, ItemLink, UpdateRequest};

/// Configuration for the compliance suite — lets an adapter declare which
/// contract points apply and which valid status values to use.
#[derive(Debug, Clone)]
pub struct ComplianceOptions {
    /// Field key for the status field. Defaults to `"status"`.
    pub status_key: String,

    /// A valid `status` value used when creating items in tests.
    pub status_active: String,

    /// A second valid `status` value used to verify status updates.
    pub status_alt: String,

    /// Field key for the long-form body. Defaults to `"content"`.
    pub content_key: String,

    /// `true` when `delete()` archives rather than hard-deletes. The harness
    /// then asserts that `get()` still succeeds after delete but the item is
    /// excluded from `list()` unless `include_archived: true` is set.
    pub delete_is_archive: bool,

    /// Set to `true` to enable the link round-trip test.
    pub supports_links: bool,

    /// Link type used in the link round-trip (e.g. `"depends_on"`).
    pub link_type: String,

    /// Target id used in the link round-trip. Adapters that don't validate
    /// link targets can leave this as the default stub id.
    pub link_target: String,
}

impl Default for ComplianceOptions {
    fn default() -> Self {
        Self {
            status_key: "status".into(),
            status_active: "planned".into(),
            status_alt: "in-progress".into(),
            content_key: "content".into(),
            delete_is_archive: true,
            supports_links: false,
            link_type: "depends_on".into(),
            link_target: "001-foundation".into(),
        }
    }
}

fn make_create_request(title: &str, body: &str, opts: &ComplianceOptions) -> CreateRequest {
    let mut fields = HashMap::new();
    fields.insert(
        opts.status_key.clone(),
        FieldValue::String(opts.status_active.clone()),
    );
    fields.insert(opts.content_key.clone(), FieldValue::String(body.into()));
    CreateRequest {
        slug: None,
        title: title.into(),
        schema_id: None,
        fields,
        links: vec![],
    }
}

/// Schema-level invariants. Pure — runs no mutations.
pub fn check_schema_consistency<A: Adapter + ?Sized>(adapter: &A, opts: &ComplianceOptions) {
    let schema = adapter.schema();
    assert!(!schema.fields.is_empty(), "schema.fields must not be empty");

    for field in &schema.fields {
        assert!(
            !field.key.is_empty(),
            "every field must have a non-empty key (offender: {field:?})"
        );
        assert!(
            !field.label.is_empty(),
            "every field must have a non-empty label (offender: {field:?})"
        );
        if let FieldKind::Enum {
            options,
            dynamic,
            allow_custom,
            ..
        } = &field.kind
        {
            // Closed-vocabulary enums (no dynamic resolution, no free-form
            // input) must declare at least one selectable option, otherwise
            // nothing can be chosen.
            if !*dynamic && !*allow_custom {
                assert!(
                    !options.is_empty(),
                    "closed enum field '{}' must have at least one option",
                    field.key
                );
            }
        }
    }

    assert!(
        schema.key_for_semantic(semantic::STATUS).is_some(),
        "schema must declare a field with semantic 'status'"
    );

    // Cross-check ComplianceOptions against the schema so misconfigured
    // adapters fail fast here with a clear message rather than deep inside
    // a CRUD or list test where the diagnostic is muddier.
    assert!(
        schema.field(&opts.status_key).is_some(),
        "ComplianceOptions.status_key '{}' must exist in the schema",
        opts.status_key
    );
    assert!(
        schema.field(&opts.content_key).is_some(),
        "ComplianceOptions.content_key '{}' must exist in the schema",
        opts.content_key
    );
    if opts.supports_links {
        assert!(
            schema.link_types.iter().any(|lt| lt.key == opts.link_type),
            "ComplianceOptions.link_type '{}' must be declared in schema.link_types",
            opts.link_type
        );
    }

    let caps = adapter.capabilities();
    assert!(!caps.name.is_empty(), "capabilities.name must not be empty");
    assert_eq!(
        caps.default_schema, schema.id,
        "capabilities.default_schema must match schema.id"
    );
}

/// Create → get → update title → update field → delete round-trip.
pub fn check_crud_roundtrip<A: Adapter + ?Sized>(adapter: &A, opts: &ComplianceOptions) {
    let marker = unique_marker();
    let title = format!("Compliance CRUD {marker}");
    let body = format!("Body for CRUD test {marker}.");
    let req = make_create_request(&title, &body, opts);

    let created = adapter
        .create(&req)
        .expect("create() must succeed for a well-formed request");
    assert!(
        !created.id.is_empty(),
        "create() must return a SpecDoc with id populated"
    );

    let fetched = adapter
        .get(&created.id)
        .expect("get() must succeed for an id just returned by create()");
    assert_eq!(
        fetched.title, title,
        "get() must return the same title that was created"
    );
    let content = fetched
        .fields
        .get(&opts.content_key)
        .and_then(|v| v.as_str())
        .unwrap_or_else(|| {
            panic!(
                "content field '{}' must be present on get() after create() set it",
                opts.content_key
            )
        });
    assert!(
        content.contains("Body for CRUD test"),
        "body content must round-trip on get() — got {content:?}"
    );

    // Title update.
    let new_title = format!("{title} (renamed)");
    let updated = adapter
        .update(
            &created.id,
            &UpdateRequest {
                title: Some(new_title.clone()),
                ..Default::default()
            },
        )
        .expect("update(title) must succeed");
    assert_eq!(updated.title, new_title, "title update must persist");
    let refetched = adapter.get(&created.id).unwrap();
    assert_eq!(
        refetched.title, new_title,
        "subsequent get() must reflect the updated title"
    );

    // Status update.
    let mut fields = HashMap::new();
    fields.insert(
        opts.status_key.clone(),
        FieldValue::String(opts.status_alt.clone()),
    );
    adapter
        .update(
            &created.id,
            &UpdateRequest {
                fields,
                ..Default::default()
            },
        )
        .expect("update(field) must succeed");
    let after_status = adapter.get(&created.id).unwrap();
    assert_eq!(
        after_status.field_str(&opts.status_key),
        Some(opts.status_alt.as_str()),
        "subsequent get() must reflect the updated status"
    );

    // Delete — semantics depend on the adapter.
    adapter.delete(&created.id).expect("delete() must succeed");
    if opts.delete_is_archive {
        adapter
            .get(&created.id)
            .expect("get() must still succeed after archive-delete");
        let listed = adapter
            .list(&ListFilter::default())
            .expect("list() must succeed after archive");
        assert!(
            !listed.iter().any(|d| d.id == created.id),
            "archived item must be excluded from list(default)"
        );
        let listed_all = adapter
            .list(&ListFilter {
                include_archived: true,
                ..Default::default()
            })
            .expect("list(include_archived=true) must succeed");
        assert!(
            listed_all.iter().any(|d| d.id == created.id),
            "archived item must reappear in list(include_archived=true)"
        );
    } else {
        match adapter.get(&created.id) {
            Err(AdapterError::NotFound(_)) => {}
            other => panic!("expected NotFound after hard-delete, got {other:?}"),
        }
    }
}

/// `list()` returns created items and respects status + text filters and the
/// archive flag.
pub fn check_list_filter<A: Adapter + ?Sized>(adapter: &A, opts: &ComplianceOptions) {
    let marker = unique_marker();
    let title = format!("Compliance ListFilter {marker}");
    let req = make_create_request(&title, "Body for list-filter test.", opts);
    let created = adapter.create(&req).expect("create must succeed");

    // Default list returns the item.
    let listed = adapter
        .list(&ListFilter::default())
        .expect("list(default) must succeed");
    assert!(
        listed.iter().any(|d| d.id == created.id),
        "list(default) must include the just-created item"
    );

    // Filter by status — created items must be findable by their active status.
    let mut field_filter: HashMap<String, Vec<String>> = HashMap::new();
    field_filter.insert(opts.status_key.clone(), vec![opts.status_active.clone()]);
    let filtered = adapter
        .list(&ListFilter {
            fields: field_filter,
            ..Default::default()
        })
        .expect("list(status filter) must succeed");
    assert!(
        filtered.iter().any(|d| d.id == created.id),
        "filtering by the active status must include the created item"
    );

    // Free-text filter on the unique marker baked into the title.
    let text_filtered = adapter
        .list(&ListFilter {
            text: Some(marker.clone()),
            ..Default::default()
        })
        .expect("list(text filter) must succeed");
    assert!(
        text_filtered.iter().any(|d| d.id == created.id),
        "free-text filter on a unique marker must match the created item"
    );

    // Cleanup: always delete the created item so persistent backends (e.g.
    // the real GitHub API in integration tests) don't accumulate fixtures
    // across compliance runs. The post-delete archive assertion is gated on
    // `delete_is_archive` because only archive adapters keep the item
    // around for the "excluded from default list" semantics.
    adapter
        .delete(&created.id)
        .expect("cleanup delete must succeed");
    if opts.delete_is_archive {
        let listed_after = adapter
            .list(&ListFilter::default())
            .expect("list after delete must succeed");
        assert!(
            !listed_after.iter().any(|d| d.id == created.id),
            "list(default) must exclude archived items"
        );
    }
}

/// `search()` hits a unique marker and returns empty for a nonsense query.
pub fn check_search<A: Adapter + ?Sized>(adapter: &A, opts: &ComplianceOptions) {
    let marker = unique_marker();
    let title = format!("Compliance Search {marker}");
    let body = format!("Search body for {marker}");
    let req = make_create_request(&title, &body, opts);
    let created = adapter.create(&req).expect("create must succeed");

    let hits = adapter
        .search(&marker, &SearchOptions::default())
        .expect("search() must succeed");
    assert!(
        hits.iter().any(|h| h.id == created.id),
        "search by unique marker must return the created item — got {hits:?}"
    );

    let no_hits = adapter
        .search(
            "nonexistent_xyz_12345_compliance",
            &SearchOptions::default(),
        )
        .expect("search() with no results must succeed");
    assert!(
        no_hits.is_empty(),
        "search for a nonexistent term must return an empty vec — got {no_hits:?}"
    );

    // Cleanup so persistent backends don't accumulate test fixtures.
    adapter
        .delete(&created.id)
        .expect("cleanup delete must succeed");
}

/// Link round-trip — skipped silently when the adapter doesn't model links.
pub fn check_links<A: Adapter + ?Sized>(adapter: &A, opts: &ComplianceOptions) {
    if !opts.supports_links {
        return;
    }
    let title = format!("Compliance Links {}", unique_marker());
    let mut req = make_create_request(&title, "Body for link test.", opts);
    req.links.push(ItemLink {
        link_type: opts.link_type.clone(),
        target_id: opts.link_target.clone(),
        target_title: None,
    });

    let created = adapter.create(&req).expect("create with link must succeed");
    let links = adapter
        .get_links(&created.id)
        .expect("get_links() must succeed");
    assert!(
        links
            .iter()
            .any(|l| l.link_type == opts.link_type && l.target_id == opts.link_target),
        "the created link must round-trip on get_links() — got {links:?}"
    );

    // Cleanup so persistent backends don't accumulate test fixtures.
    adapter
        .delete(&created.id)
        .expect("cleanup delete must succeed");
}

/// `get` / `update` / `delete` on a nonexistent id all return `NotFound`.
pub fn check_error_cases<A: Adapter + ?Sized>(adapter: &A, _opts: &ComplianceOptions) {
    let missing = "nonexistent_xyz_12345_compliance";

    match adapter.get(missing) {
        Err(AdapterError::NotFound(_)) => {}
        other => panic!("get(nonexistent) must return NotFound; got {other:?}"),
    }

    match adapter.update(missing, &UpdateRequest::default()) {
        Err(AdapterError::NotFound(_)) => {}
        other => panic!("update(nonexistent) must return NotFound; got {other:?}"),
    }

    match adapter.delete(missing) {
        Err(AdapterError::NotFound(_)) => {}
        other => panic!("delete(nonexistent) must return NotFound; got {other:?}"),
    }
}

/// Run every compliance check sequentially against a single adapter instance.
///
/// Each check creates its own items with a unique marker so they don't
/// interfere with each other.
pub fn run_compliance_suite<A: Adapter + ?Sized>(adapter: &A, opts: &ComplianceOptions) {
    check_schema_consistency(adapter, opts);
    check_crud_roundtrip(adapter, opts);
    check_list_filter(adapter, opts);
    check_search(adapter, opts);
    check_links(adapter, opts);
    check_error_cases(adapter, opts);
}

/// Short unique marker used to disambiguate items created within one
/// compliance run. Nanosecond clock keeps adjacent items distinct.
fn unique_marker() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    let bump = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("c{nanos:x}{bump:x}")
}

/// Generate one `#[test]` function per compliance category, all driven by a
/// factory closure that returns `(adapter, fixture)`.
///
/// The fixture (e.g. a `TempDir` or a `mockito::ServerGuard`) is held alive
/// by each test until it finishes. Each test calls the factory afresh so
/// state from previous categories cannot bleed across tests.
///
/// The single-argument form uses [`ComplianceOptions::default`]. The
/// two-argument form lets the adapter customise status values and skip
/// flags.
#[macro_export]
macro_rules! adapter_compliance_tests {
    ($factory:expr $(,)?) => {
        $crate::adapter_compliance_tests!(
            $factory,
            $crate::adapters::test_harness::ComplianceOptions::default()
        );
    };
    ($factory:expr, $opts:expr $(,)?) => {
        #[test]
        fn compliance_schema_consistency() {
            let (adapter, _fixture) = ($factory)();
            let opts = $opts;
            $crate::adapters::test_harness::check_schema_consistency(&adapter, &opts);
        }

        #[test]
        fn compliance_crud_roundtrip() {
            let (adapter, _fixture) = ($factory)();
            let opts = $opts;
            $crate::adapters::test_harness::check_crud_roundtrip(&adapter, &opts);
        }

        #[test]
        fn compliance_list_filter() {
            let (adapter, _fixture) = ($factory)();
            let opts = $opts;
            $crate::adapters::test_harness::check_list_filter(&adapter, &opts);
        }

        #[test]
        fn compliance_search() {
            let (adapter, _fixture) = ($factory)();
            let opts = $opts;
            $crate::adapters::test_harness::check_search(&adapter, &opts);
        }

        #[test]
        fn compliance_links() {
            let (adapter, _fixture) = ($factory)();
            let opts = $opts;
            $crate::adapters::test_harness::check_links(&adapter, &opts);
        }

        #[test]
        fn compliance_error_cases() {
            let (adapter, _fixture) = ($factory)();
            let opts = $opts;
            $crate::adapters::test_harness::check_error_cases(&adapter, &opts);
        }
    };
}
