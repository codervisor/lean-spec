---
status: in-progress
created: 2026-02-05
priority: medium
tags:
- ui
- ux
- settings
- ai
created_at: 2026-02-05T13:25:57.767830Z
updated_at: 2026-02-05T13:25:57.767830Z
---
# AI Settings UX Optimization

## Overview

The current `/settings/ai` page uses a single "Configure" button for registry providers, which opens a dialog with tabs for "API Key" and "Models".

The user wants to optimize this UX by separating these into distinct action buttons and dialogs. This reduces friction and makes the specific actions (setting a key vs configuring models) more direct.

## Design

### UI Changes

1.  **RegistryProviderCard**:
    *   Remove the single "Configure" button.
    *   Add two separate buttons/actions:
        *   **API Key**: Button or icon-action to open API Key configuration.
        *   **Models**: Button or icon-action to open Model configuration.
    *   Update icons to better represent actions (e.g., Key icon for API Key, List/Check icon for Models).

2.  **Dialogs**:
    *   Refactor `ProviderConfigDialog` (which currently has tabs) into two focused dialogs:
        *   `ProviderApiKeyDialog`: Only contains the API key (and resource name for Azure) logic.
        *   `ProviderModelsDialog`: Only contains the model restriction/selection logic.

### Interaction Flow

*   User clicks "API Key" -> Opens key dialog directly.
*   User clicks "Models" -> Opens models dialog directly.

## Plan

- [x] Refactor `ProviderConfigDialog` in `packages/ui/src/components/settings/AISettingsTab.tsx`
    - [x] Create `ProviderApiKeyDialog` component
    - [x] Create `ProviderModelsDialog` component
- [x] Update `AISettingsTab` state
    - [x] Add state for `showApiKeyDialog` (providerId)
    - [x] Add state for `showModelsDialog` (providerId)
    - [x] Remove `showConfigDialog` state
- [x] Update `RegistryProviderCard`
    - [x] Replace `onConfigure` prop with `onConfigureKey` and `onConfigureModels`
    - [x] Render two separate buttons
- [x] Update `AISettingsTab` render
    - [x] Pass new handlers to `RegistryProviderCard`
    - [x] Render the new split dialogs based on state

## Test

- [ ] Verify "API Key" button opens the key dialog.
- [ ] Verify saving API key works.
- [ ] Verify "Models" button opens the models dialog.
- [ ] Verify saving model restrictions works.
- [ ] Verify Custom Providers (which use a different dialog) are unaffected or updated if applicable (focus is on Registry Providers first).

## Progress

- Date: 2026-02-05
- Verified complete: UI split into API key and models dialogs; Registry provider card shows separate actions; new dialog state and render wiring in AI settings.
- Pending: Manual verification of API key save, model restrictions save, and custom provider behavior.
- Blockers: None