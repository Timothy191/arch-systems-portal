use wgpu::{self, util::DeviceExt};
use cgmath::{SquareMatrix, Vector3, Matrix4, Deg, Rad};

/// 3D transformation matrix utilities for graphics rendering
pub mod matrix {
    use super::*;
    
    /// Create a 4x4 transformation matrix for 3D graphics
    pub fn create_transform_matrix(
        translation: Vector3<f32>,
        rotation: Vector3<f32>,
        scale: Vector3<f32>
    ) -> Matrix4<f32> {
        let translate = Matrix4::from_translation(translation);
        let rotate_x = Matrix4::from_angle_x(Deg(rotation.x));
        let rotate_y = Matrix4::from_angle_y(Deg(rotation.y));
        let rotate_z = Matrix4::from_angle_z(Deg(rotation.z));
        let scale = Matrix4::from_nonuniform_scale(scale.x, scale.y, scale.z);
        
        translate * rotate_x * rotate_y * rotate_z * scale
    }
    
    /// Create a perspective projection matrix
    pub fn create_perspective_matrix(
        aspect_ratio: f32,
        fov_y: f32,
        near: f32,
        far: f32
    ) -> Matrix4<f32> {
        let fov_rad: Rad<f32> = Rad(Deg(fov_y).0.to_radians());
        let f = 1.0 / fov_rad.0.tan();
        Matrix4::new(
            f / aspect_ratio, 0.0, 0.0, 0.0,
            0.0, f, 0.0, 0.0,
            0.0, 0.0, (far + near) / (near - far), -1.0,
            0.0, 0.0, (2.0 * far * near) / (near - far), 0.0
        )
    }
}

/// Heatmap rendering utilities for thermal/occupancy visualization
pub mod heatmap {
    /// Generate a heatmap from temperature/occupancy data
    pub fn generate_heatmap(data: &[f32], width: u32, height: u32) -> Vec<u8> {
        // Simple heatmap generation - in practice would use shaders
        let mut pixels = vec![0u8; (width * height * 4) as usize];
        
        // Find min/max for normalization
        let mut min_val = f32::INFINITY;
        let mut max_val = f32::NEG_INFINITY;
        
        for &value in data.iter() {
            if value < min_val { min_val = value; }
            if value > max_val { max_val = value; }
        }
        
        let range = if max_val - min_val > 0.0 { max_val - min_val } else { 1.0 };
        
        // Generate heatmap colors (blue -> cyan -> yellow -> red)
        for (i, &value) in data.iter().enumerate() {
            if i >= pixels.len() / 4 { break; }
            
            let normalized = (value - min_val) / range;
            let r = (normalized * 255.0) as u8;
            let b = ((1.0 - normalized) * 255.0) as u8;
            let g = if normalized < 0.5 { (normalized * 2.0 * 255.0) as u8 } 
                    else { ((1.0 - normalized) * 2.0 * 255.0) as u8 };
            
            let idx = i * 4;
            pixels[idx] = r;     // Red
            pixels[idx + 1] = g; // Green
            pixels[idx + 2] = b; // Blue
            pixels[idx + 3] = 255; // Alpha
        }
        
        pixels
    }
    
    /// Apply Gaussian blur to smooth the heatmap
    pub fn apply_gaussian_blur(pixels: &mut [u8], width: u32, height: u32, radius: u32) {
        // Simplified blur - in production would use compute shaders
        if radius == 0 || width < 3 || height < 3 { return; }
        
        let mut temp = vec![0u8; pixels.len()];
        let radius = radius as usize;
        
        // Horizontal pass
        for y in 0..height as usize {
            for x in 0..width as usize {
                let mut r_sum = 0u32;
                let mut g_sum = 0u32;
                let mut b_sum = 0u32;
                let mut count = 0;
                
                for dx in -(radius as i32)..=(radius as i32) {
                    let nx = (x as i32 + dx).clamp(0, width as i32 - 1) as usize;
                    let idx = (y * width as usize + nx) * 4;
                    r_sum += pixels[idx] as u32;
                    g_sum += pixels[idx + 1] as u32;
                    b_sum += pixels[idx + 2] as u32;
                    count += 1;
                }
                
                let idx = (y * width as usize + x) * 4;
                temp[idx] = (r_sum / count) as u8;
                temp[idx + 1] = (g_sum / count) as u8;
                temp[idx + 2] = (b_sum / count) as u8;
                temp[idx + 3] = 255;
            }
        }
        
        // Vertical pass
        for y in 0..height as usize {
            for x in 0..width as usize {
                let mut r_sum = 0u32;
                let mut g_sum = 0u32;
                let mut b_sum = 0u32;
                let mut count = 0;
                
                for dy in -(radius as i32)..=(radius as i32) {
                    let ny = (y as i32 + dy).clamp(0, height as i32 - 1) as usize;
                    let idx = (ny * width as usize + x) * 4;
                    r_sum += temp[idx] as u32;
                    g_sum += temp[idx + 1] as u32;
                    b_sum += temp[idx + 2] as u32;
                    count += 1;
                }
                
                let idx = (y * width as usize + x) * 4;
                pixels[idx] = (r_sum / count) as u8;
                pixels[idx + 1] = (g_sum / count) as u8;
                pixels[idx + 2] = (b_sum / count) as u8;
                pixels[idx + 3] = 255;
            }
        }
    }
}

/// SVG-style vector rendering using lyon for 2D graphics
pub mod svg {
    use lyon::math::Point;
    
    /// Stub SvgRenderer for now — full lyon integration deferred
    pub struct SvgRenderer;
    
    impl SvgRenderer {
        pub fn new() -> Self {
            Self
        }
    }
}

/// WASM export utilities for browser-based rendering
#[cfg(target_arch = "wasm32")]
pub mod wasm {
    use wasm_bindgen::prelude::*;
    use super::{matrix, heatmap, svg};
    use web_sys::{WebGlRenderingContext as Gl, WebGlProgram, WebGlShader};
    
    /// Initialize WebGL context for rendering
    #[wasm_bindgen]
    pub fn init_webgl(canvas_id: &str) -> Result<web_sys::WebGlRenderingContext, JsValue> {
        let web_sys_window = web_sys::window().ok_or_else(|| JsValue::from_str("No window found"))?;
        let document = web_sys_window.document().ok_or_else(|| JsValue::from_str("No document found"))?;
        let canvas = document.get_element_by_id(canvas_id)
            .ok_or_else(|| JsValue::from_str("Canvas not found"))?
            .dyn_into::<web_sys::HtmlCanvasElement>()?;
            
        let gl = canvas
            .get_context("webgl")?
            .ok_or_else(|| JsValue::from_str("Failed to get WebGL context"))?
            .dyn_into::<web_sys::WebGlRenderingContext>()?;
            
        Ok(gl)
    }
    
    /// Render a heatmap using WebGL
    #[wasm_bindgen]
    pub fn render_heatmap_gl(
        gl: &web_sys::WebGlRenderingContext,
        data: &[f32],
        width: u32,
        height: u32
    ) -> Result<(), JsValue> {
        // Generate heatmap data
        let heatmap_data = super::heatmap::generate_heatmap(data, width, height);
        
        // Create and bind texture
        let texture = gl.create_texture().ok_or("Failed to create texture")?;
        gl.bind_texture(gl::TEXTURE_2D, Some(&texture));
        
        // Upload texture data
        gl.tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_opt_u8_array(
            gl::TEXTURE_2D,
            0,
            gl::RGBA as i32,
            width as i32,
            height as i32,
            0,
            gl::RGBA,
            gl::UNSIGNED_BYTE,
            Some(&heatmap_data),
        )?;
        
        // Set texture parameters
        gl.tex_parameteri(gl::TEXTURE_2D, gl::TEXTURE_MIN_FILTER, gl::LINEAR as i32);
        gl.tex_parameteri(gl::TEXTURE_2D, gl::TEXTURE_MAG_FILTER, gl::LINEAR as i32);
        gl.tex_parameteri(gl::TEXTURE_2D, gl::TEXTURE_WRAP_S, gl::CLAMP_TO_EDGE as i32);
        gl.tex_parameteri(gl::TEXTURE_2D, gl::TEXTURE_WRAP_T, gl::CLAMP_TO_EDGE as i32);
        
        Ok(())
    }
    
    /// Render 3D equipment models
    #[wasm_bindgen]
    pub fn render_equipment_gl(
        gl: &web_sys::WebGlRenderingContext,
        lat: f64,
        lon: f64,
        altitude: f64
    ) -> Result<(), JsValue> {
        // Convert lat/lon/alt to 3D coordinates (simplified)
        let x = (lat.cos() * (6378137.0 + altitude as f64)) as f32;
        let y = (lat.sin() * (6378137.0 + altitude as f64)) as f32;
        let z = (lon * 111320.0 * lat.cos()) as f32; // Approximate
        
        // In a real implementation, we would load and render 3D models here
        // For now, we'll just set up the transformation matrix
        
        let transform = super::matrix::create_transform_matrix(
            [x, y, z].into(),
            [0.0, 0.0, 0.0].into(),
            [1.0, 1.0, 1.0].into(),
        );
        
        // Upload transformation matrix to shader uniforms
        // (Implementation would depend on shader setup)
        
        Ok(())
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub mod wasm {
    /// Stub implementations for non-WASM targets
    pub fn init_webgl(_canvas_id: &str) -> Result<(), ()> {
        Err(())
    }
    
    pub fn render_heatmap_gl(_data: &[f32], _width: u32, _height: u32) -> Result<(), ()> {
        Err(())
    }
    
    pub fn render_equipment_gl(_lat: f64, _lon: f64, _altitude: f64) -> Result<(), ()> {
        Err(())
    }
}
