use leanspec_http::types::{ContextFile, HealthResponse};
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
    fs::write(&file_path, T::decl()).expect("failed to write generated type file");
}

#[test]
fn export_bindings() {
    write_binding::<HealthResponse>();
    write_binding::<ContextFile>();
}
