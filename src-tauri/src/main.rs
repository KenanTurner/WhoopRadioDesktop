#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
	use std::{
		cmp::min,
		io::{Read, Seek, SeekFrom},
	};
	use tauri::http::{HttpRange, ResponseBuilder};
	
	tauri::Builder::default()
		.plugin(tauri_plugin_sql::Builder::default().build())
		.register_uri_scheme_protocol("stream", move |_app, request| {
			// prepare our response
			let mut response = ResponseBuilder::new();
			// get the file path
			let path = request.uri().strip_prefix("stream://localhost/").unwrap();
			let path = percent_encoding::percent_decode(path.as_bytes())
				.decode_utf8_lossy()
				.to_string();

			// read our file
			let mut content = std::fs::File::open(&path)?;
			let mut buf = Vec::new();

			// default status code
			let mut status_code = 200;

			// if the webview sent a range header, we need to send a 206 in return
			// Actually only macOS and Windows are supported. Linux will ALWAYS return empty headers.
			if let Some(range) = request.headers().get("range") {
				// Get the file size
				let file_size = content.metadata().unwrap().len();

				// we parse the range header with tauri helper
				let range = HttpRange::parse(range.to_str().unwrap(), file_size).unwrap();
				// let support only 1 range for now
				let first_range = range.first();
				if let Some(range) = first_range {
					let mut real_length = range.length;

					// prevent max_length;
					// specially on webview2
					if range.length > file_size / 3 {
						// max size sent (400ko / request)
						// as it's local file system we can afford to read more often
						real_length = min(file_size - range.start, 1024 * 400);
					}

					// last byte we are reading, the length of the range include the last byte
					// who should be skipped on the header
					let last_byte = range.start + real_length - 1;
					// partial content
					status_code = 206;

					// Only macOS and Windows are supported, if you set headers in linux they are ignored
					response = response
						.header("Connection", "Keep-Alive")
						.header("Accept-Ranges", "bytes")
						.header("Content-Length", real_length)
						.header(
							"Content-Range",
							format!("bytes {}-{}/{}", range.start, last_byte, file_size),
						);

					// FIXME: Add ETag support (caching on the webview)

					// seek our file bytes
					content.seek(SeekFrom::Start(range.start))?;
					content.take(real_length).read_to_end(&mut buf)?;
				} else {
					content.read_to_end(&mut buf)?;
				}
			}
			response.mimetype("application/octet-stream").status(status_code).body(buf)
		})
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
