use leanspec_core::{SpecPriority, SpecStatus, StatusTransition};
use leanspec_http::types::{
    BatchMetadataRequest, BatchMetadataResponse, ChecklistToggleItem, ChecklistToggleRequest,
    ChecklistToggleResponse, ChecklistToggledResult, ConfigFeatures, ConfigStructure, ContextFile,
    CreateSpecRequest, DependencyEdge, DependencyGraphResponse, DependencyNode, DependencyResponse,
    DetailedBreakdown, DraftStatusConfig, FrontmatterResponse, HealthResponse, HierarchyNode,
    LeanSpecConfig, ListSpecsQuery, ListSpecsResponse, MetadataUpdate, PriorityCountItem,
    ProjectConfigResponse, ProjectContextResponse, ProjectValidationResponse,
    ProjectValidationSummary, SearchFilters, SearchRequest, SearchResponse, SectionTokenCount,
    SpecDetail, SpecMetadata, SpecRawResponse, SpecRawUpdateRequest, SpecRelationships,
    SpecSummary, SpecTokenResponse, SpecValidationError, SpecValidationResponse, StatsResponse,
    StatusCountItem, SubSpec, TokenBreakdown, UpdateMetadataResponse, ValidationError,
    ValidationResponse,
};
use std::fs;
use std::path::PathBuf;
use ts_rs::TS;

fn generated_dir() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .join("..")
        .join("..")
        .join("packages")
        .join("ui")
        .join("src")
        .join("types")
        .join("generated")
}

fn write_binding<T: TS>() {
    let dir = generated_dir();
    fs::create_dir_all(&dir).expect("failed to create generated types directory");
    let file_path = dir.join(format!("{}.ts", T::name()));
    let decl = T::decl();
    let exported =
        if decl.starts_with("type ") || decl.starts_with("interface ") || decl.starts_with("enum ")
        {
            format!("export {decl}")
        } else {
            decl
        };
    fs::write(&file_path, exported).expect("failed to write generated type file");
}

#[test]
fn export_bindings() {
    // Core spec types
    write_binding::<SpecSummary>();
    write_binding::<SpecDetail>();
    write_binding::<SpecRelationships>();
    write_binding::<SubSpec>();
    write_binding::<SpecRawResponse>();
    write_binding::<SpecRawUpdateRequest>();

    // Checklist
    write_binding::<ChecklistToggleRequest>();
    write_binding::<ChecklistToggleItem>();
    write_binding::<ChecklistToggleResponse>();
    write_binding::<ChecklistToggledResult>();

    // Create / Update
    write_binding::<CreateSpecRequest>();
    write_binding::<MetadataUpdate>();
    write_binding::<UpdateMetadataResponse>();
    write_binding::<FrontmatterResponse>();

    // List / Hierarchy
    write_binding::<ListSpecsResponse>();
    write_binding::<HierarchyNode>();
    write_binding::<ListSpecsQuery>();

    // Search
    write_binding::<SearchResponse>();
    write_binding::<SearchRequest>();
    write_binding::<SearchFilters>();

    // Stats
    write_binding::<StatsResponse>();
    write_binding::<StatusCountItem>();
    write_binding::<PriorityCountItem>();

    // Dependencies
    write_binding::<DependencyResponse>();
    write_binding::<DependencyGraphResponse>();
    write_binding::<DependencyNode>();
    write_binding::<DependencyEdge>();

    // Validation
    write_binding::<ValidationResponse>();
    write_binding::<ValidationError>();
    write_binding::<SpecTokenResponse>();
    write_binding::<SectionTokenCount>();
    write_binding::<DetailedBreakdown>();
    write_binding::<TokenBreakdown>();
    write_binding::<SpecValidationResponse>();
    write_binding::<SpecValidationError>();

    // Batch
    write_binding::<BatchMetadataRequest>();
    write_binding::<BatchMetadataResponse>();
    write_binding::<SpecMetadata>();

    // Project
    write_binding::<ProjectValidationResponse>();
    write_binding::<ProjectValidationSummary>();
    write_binding::<ProjectConfigResponse>();
    write_binding::<ProjectContextResponse>();

    // Config
    write_binding::<LeanSpecConfig>();
    write_binding::<DraftStatusConfig>();
    write_binding::<ConfigStructure>();
    write_binding::<ConfigFeatures>();

    // Common
    write_binding::<HealthResponse>();
    write_binding::<ContextFile>();

    // Core domain types
    write_binding::<SpecStatus>();
    write_binding::<SpecPriority>();
    write_binding::<StatusTransition>();
}
