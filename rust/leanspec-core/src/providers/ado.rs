//! Azure DevOps (ADO) provider — use ADO Work Items as spec backend.
//!
//! This provider maps LeanSpec concepts to ADO Work Item primitives:
//!
//! | LeanSpec       | ADO Work Items                   |
//! |---------------|----------------------------------|
//! | Spec ID       | Work Item ID                     |
//! | Status        | State field (New, Active, Closed) |
//! | Priority      | Priority field (1-4)             |
//! | Tags          | Tags field                       |
//! | Dependencies  | Related/Predecessor links        |
//! | Assignee      | Assigned To field                |
//! | Parent/Epic   | Parent link / Epic type          |
//! | Content       | Description field (HTML→markdown)|
//!
//! ## Configuration
//!
//! ```yaml
//! provider: ado
//! organization: mycompany
//! project: myproject
//! work_item_type: "User Story"
//! ```
//!
//! ## Status
//!
//! This is a stub implementation. The actual ADO REST API integration will be
//! implemented in a future phase. See spec 381 for the roadmap.

use crate::search::{SearchOptions, SearchResult};
use crate::spec_ops::DependencyGraph;
use crate::types::{SpecFilterOptions, SpecInfo};

use super::{
    CreateSpecRequest, ProviderCapabilities, ProviderError, SpecProvider, UpdateSpecRequest,
};

/// Spec provider backed by Azure DevOps Work Items.
///
/// Maps ADO Work Items to LeanSpec specs using field mappings for status,
/// priority, and tags.
pub struct AdoProvider {
    #[allow(dead_code)]
    organization: String,
    #[allow(dead_code)]
    project: String,
    #[allow(dead_code)]
    work_item_type: String,
}

impl AdoProvider {
    /// Create a new ADO provider.
    pub fn new(organization: &str, project: &str, work_item_type: &str) -> Self {
        Self {
            organization: organization.to_string(),
            project: project.to_string(),
            work_item_type: work_item_type.to_string(),
        }
    }

    fn not_implemented(&self, operation: &str) -> ProviderError {
        ProviderError::NotSupported {
            provider: self.name().to_string(),
            operation: format!(
                "{} (ADO provider not yet implemented — see spec 381)",
                operation
            ),
        }
    }
}

impl SpecProvider for AdoProvider {
    fn name(&self) -> &str {
        "ado"
    }

    fn capabilities(&self) -> ProviderCapabilities {
        // When fully implemented, ADO will support most operations
        // including dependency tracking via work item links.
        ProviderCapabilities {
            create: true,
            update: true,
            delete: false, // ADO work items are typically not deleted
            search: true,
            dependencies: true, // ADO natively supports predecessor/successor links
            custom_fields: true, // ADO supports custom fields
            webhooks: true,     // ADO supports service hooks
            bidirectional_sync: true,
        }
    }

    fn list(&self, _filters: &SpecFilterOptions) -> Result<Vec<SpecInfo>, ProviderError> {
        Err(self.not_implemented("list"))
    }

    fn get(&self, id: &str) -> Result<SpecInfo, ProviderError> {
        Err(self.not_implemented(&format!("get({})", id)))
    }

    fn create(&self, _request: &CreateSpecRequest) -> Result<SpecInfo, ProviderError> {
        Err(self.not_implemented("create"))
    }

    fn update(&self, id: &str, _request: &UpdateSpecRequest) -> Result<SpecInfo, ProviderError> {
        Err(self.not_implemented(&format!("update({})", id)))
    }

    fn search(
        &self,
        _query: &str,
        _options: &SearchOptions,
    ) -> Result<Vec<SearchResult>, ProviderError> {
        Err(self.not_implemented("search"))
    }

    fn dependencies(&self, _id: &str) -> Result<DependencyGraph, ProviderError> {
        Err(self.not_implemented("dependencies"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ado_provider_name() {
        let provider = AdoProvider::new("myorg", "myproject", "User Story");
        assert_eq!(provider.name(), "ado");
    }

    #[test]
    fn test_ado_provider_capabilities() {
        let provider = AdoProvider::new("myorg", "myproject", "User Story");
        let caps = provider.capabilities();
        assert!(caps.create);
        assert!(caps.update);
        assert!(!caps.delete);
        assert!(caps.search);
        assert!(caps.dependencies); // ADO supports work item links
        assert!(caps.custom_fields); // ADO supports custom fields
    }

    #[test]
    fn test_ado_provider_returns_not_supported() {
        let provider = AdoProvider::new("myorg", "myproject", "User Story");

        let result = provider.list(&SpecFilterOptions::default());
        assert!(matches!(result, Err(ProviderError::NotSupported { .. })));

        let result = provider.get("12345");
        assert!(matches!(result, Err(ProviderError::NotSupported { .. })));
    }
}
