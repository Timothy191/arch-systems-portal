//! N-API build script — required by napi-rs to produce `.node` files
extern crate napi_build;

fn main() {
    napi_build::setup();
}
