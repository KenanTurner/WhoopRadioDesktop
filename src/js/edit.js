import { yt_dlp } from '/js/tauri.js';
import { album_table, track_table } from '/js/database.js';
import AsyncQueue from '/js/async-queue.js';

const edit_track_container = document.getElementById("edit-track-container");
const edit_album_container = document.getElementById("edit-album-container");
const upload_json_container = document.getElementById("upload-json-container");
const info_container = document.getElementById("info-container");

//################ Modal EventListeners ################
window.addEventListener('click',function(event){
	if(event.target === edit_track_container) edit_track_container.classList.add('hidden');
	if(event.target === edit_album_container) edit_album_container.classList.add('hidden');
	if(event.target === upload_json_container) upload_json_container.classList.add('hidden');
	if(event.target === info_container) info_container.classList.add('hidden');
});

//################ Edit Track Container ################
const edit_track_form = edit_track_container.querySelector(".form");

const edit_track_meta = edit_track_form.querySelector("#edit-meta");
const edit_track_meta_btn = edit_track_form.querySelector("#edit-meta-btn");

const edit_track_id = edit_track_form.querySelector("#edit-id");
const edit_track_src = edit_track_form.querySelector("#edit-src");
const edit_track_path = edit_track_form.querySelector("#edit-path");
const edit_track_title = edit_track_form.querySelector("#edit-title");
const edit_track_album = edit_track_form.querySelector("#edit-album");
const edit_track_duration = edit_track_form.querySelector("#edit-duration");
const edit_track_artwork_url = edit_track_form.querySelector("#edit-artwork-url");
const edit_track_artwork_path = edit_track_form.querySelector("#edit-artwork-path");

const edit_track_delete = edit_track_form.querySelector("#edit-delete");
const edit_track_reset = edit_track_form.querySelector("input[type=reset]");
const edit_track_submit = edit_track_form.querySelector("input[type=submit]");

const edit_track_inputs = [
	edit_track_id,
	edit_track_src,
	edit_track_path,
	edit_track_title,
	edit_track_album,
	edit_track_duration,
	edit_track_artwork_url,
	edit_track_artwork_path,
]

// ################### Fetch Metadata ###################
function validateTrackMeta(){
	return edit_track_meta.value !== "" && edit_track_meta.reportValidity();
}

edit_track_meta_btn.addEventListener("click", async function(){
	if(!validateTrackMeta()) return;
	edit_track_meta_btn.value = "Loading...";
	edit_track_meta_btn.disabled = true;
	edit_track_meta_btn._loading = true;
	const url = edit_track_meta.value;
	try{
		const response = await yt_dlp(url);
		
		edit_track_src.value = response.webpage_url || response.original_url || "";
		edit_track_title.value = response.track || response.fulltitle || response.title || "";
		edit_track_duration.value = response.duration? Math.ceil(response.duration): "";
		edit_track_artwork_url.value = response.thumbnail || "";
		validateTrack();
		
		edit_track_meta_btn.value = "Fetch";
	}catch(e){
		console.error(e);
		edit_track_meta_btn.value = "Error!";
	}
	edit_track_meta_btn._loading = false;
	edit_track_meta_btn.disabled = validateTrackMeta()? false: true;
});

edit_track_meta.addEventListener("change", function(){
	if(edit_track_meta_btn._loading) return;
	edit_track_meta_btn.disabled = validateTrackMeta()? false: true;
});

// ################### Track Validation ###################
function validateTrack(alert_user = true){
	const all_valid = edit_track_inputs.every(function(el){
		return alert_user? el.reportValidity(): el.checkValidity();
	})
	edit_track_submit.disabled = !all_valid;
	edit_track_submit.value = "Submit";
	edit_track_delete.value = "Delete Track";
	edit_track_delete.disabled = edit_track_id.value? false: true;
	return all_valid;
}

edit_track_meta.addEventListener("change", function(){
	if(edit_track_meta_btn.value === "Error!") edit_track_meta_btn.value = "Fetch";
});
edit_track_src.addEventListener("change", validateTrack);
edit_track_title.addEventListener("change", validateTrack);
edit_track_artwork_url.addEventListener("change", validateTrack);

// ################### Track Submit and Reset ###################
function disableTrack(disabled = true){
	edit_track_meta.disabled = disabled;
	edit_track_meta_btn.disabled = disabled;

	edit_track_inputs.forEach(function(el){
		el.disabled = disabled;
	});

	edit_track_reset.disabled = disabled;
}

edit_track_form.addEventListener("submit", async function(e){
	e.preventDefault();
	if(!validateTrack()) return;
	disableTrack();
	
	edit_track_submit.value = "Submitting...";
	edit_track_submit.disabled = true;
	edit_track_delete.disabled = true;
	
	const track = {
		id: (edit_track_id.value !== '')? Number(edit_track_id.value): '',
		src: edit_track_src.value,
		path: edit_track_path.value,
		title: edit_track_title.value,
		album: (edit_track_album.value !== '')? Number(edit_track_album.value): '',
		duration: (edit_track_duration.value === '')? Number(edit_track_duration.value): '',
		artwork_url: edit_track_artwork_url.value,
		artwork_path: edit_track_artwork_path.value,
	}
	try{
		if(track.id){
			await track_table.update(track);
		}else{
			await track_table.insert(track);
		}
		edit_track_container.classList.add('hidden');
		edit_track_reset.dispatchEvent(new Event("click"));
	}catch(e){
		console.error(e);
		edit_track_submit.value = "Error!";
	}
	
	disableTrack(false);
});
edit_track_reset.addEventListener("click", function(e){
	e.preventDefault();
	edit_track_form.reset();
	validateTrack(false);
});

// ################### Exported Edit Function ###################
function editTrack(track){
	edit_track_meta.defaultValue = track.src || "";
	
	edit_track_id.defaultValue = track.id || "";
	edit_track_src.value = track.src || "";
	edit_track_path.value = track.path || "";
	edit_track_title.value = track.title || "";
	edit_track_album.defaultValue = track.album || "";
	edit_track_duration.value = track.duration || "";
	edit_track_artwork_url.value = track.artwork_url || "";
	edit_track_artwork_path.value = track.artwork_path || "";
	
	validateTrack(false);
	
	edit_track_container.classList.remove('hidden');
}

// ################### EventListeners ###################
edit_track_delete.addEventListener("click", async function(){
	if(!await window.confirm("Delete Track?")) return;
	edit_track_delete.disabled = true;
	edit_track_delete.value = "Deleting...";
	
	try{
		await track_table.remove({id: Number(edit_track_id.value)});
		edit_track_container.classList.add('hidden');
		edit_track_reset.dispatchEvent(new Event("click"));
	}catch(e){
		console.error(e);
		edit_track_delete.value = "Error!";
	}
});

const add_track_el = document.getElementById("add-track");
add_track_el.addEventListener("click", function(){
	const album_id = document.querySelector("album-row").dataset.album;
	editTrack({album:album_id});
});

//################ Edit Album Container ################
const edit_album_form = edit_album_container.querySelector(".form");

const edit_album_meta = edit_album_form.querySelector("#edit-meta");
const edit_album_meta_btn = edit_album_form.querySelector("#edit-meta-btn");

const edit_album_id = edit_album_form.querySelector("#edit-id");
const edit_album_src = edit_album_form.querySelector("#edit-src");
const edit_album_title = edit_album_form.querySelector("#edit-title");
const edit_album_artwork_url = edit_album_form.querySelector("#edit-artwork-url");
const edit_album_artwork_path = edit_album_form.querySelector("#edit-artwork-path");

const edit_album_autofill = edit_album_form.querySelector("#edit-autofill");
const edit_album_delete = edit_album_form.querySelector("#edit-delete");
const edit_album_reset = edit_album_form.querySelector("input[type=reset]");
const edit_album_submit = edit_album_form.querySelector("input[type=submit]");

const edit_album_inputs = [
	edit_album_id,
	edit_album_src,
	edit_album_title,
	edit_album_artwork_url,
	edit_album_artwork_path,
]

// ################### Fetch Metadata ###################
function validateAlbumMeta(){
	return edit_album_meta.value !== "" && edit_album_meta.reportValidity();
}

edit_album_meta_btn.addEventListener("click", async function(){
	if(!validateAlbumMeta()) return;
	edit_album_meta_btn.disabled = true;
	edit_album_meta_btn.value = "Loading...";
	
	const url = edit_album_meta.value;
	try{
		const [album, track] = await Promise.all([
			yt_dlp(url, true),
			yt_dlp(url, false)
		]);
		
		edit_album_src.value = album.webpage_url;
		edit_album_title.value = album.title;
		edit_album_artwork_url.value = track.thumbnail || "";
		validateAlbum();
		
		edit_album_meta_btn.value = "Fetch";
	}catch(e){
		console.error(e);
		edit_album_meta_btn.value = "Error!";
	}
	edit_album_meta_btn.disabled = validateAlbumMeta()? false: true;
});

edit_album_meta.addEventListener("change", function(){
	if(edit_album_meta_btn.value === "Loading...") return;
	edit_album_meta_btn.disabled = validateAlbumMeta()? false: true;
});

// ################### Validation ###################
function validateAlbum(alert_user = true){
	const all_valid = edit_album_inputs.every(function(el){
		return alert_user? el.reportValidity(): el.checkValidity();
	})
	edit_album_submit.value = "Submit";
	edit_album_submit.disabled = !all_valid;
	edit_album_reset.value = "Reset";
	edit_album_reset.disabled = false;
	edit_album_delete.value = "Delete Album";
	edit_album_delete.disabled = edit_album_id.value? false: true;
	edit_album_autofill.value = "Submit and Autofill Tracks";
	edit_album_autofill.disabled = (all_valid && edit_album_src.value)? false: true;
	return all_valid;
}

// ################### Exported Edit Function ###################
function editAlbum(album){
	edit_album_meta.defaultValue = album.src || "";
	
	edit_album_id.defaultValue = album.id || "";
	edit_album_src.value = album.src || "";
	edit_album_title.value = album.title || "";
	edit_album_artwork_url.value = album.artwork_url || "";
	edit_album_artwork_path.value = album.artwork_path || "";
	
	validateAlbum();
	
	edit_album_container.classList.remove('hidden');
}

// ################### EventListeners ###################
edit_album_delete.addEventListener("click", async function(){
	if(!await window.confirm("Delete Album?\nWARNING: This will delete all tracks!")) return;
	disableAlbum();
	
	edit_album_delete.disabled = true;
	edit_album_delete.value = "Deleting...";
	try{
		window.history.replaceState(null, '');
		window.history.back();
		
		const where = [{key:"album",op:"=",value:Number(edit_album_id.value)}];
		const tracks = await track_table.select({where});
		await Promise.all(tracks.map(function(track){
			return track_table.remove(track);
		}));
		await album_table.remove({id: Number(edit_album_id.value)});
		edit_album_container.classList.add('hidden');
		edit_album_reset.dispatchEvent(new Event("click"));
	}catch(e){
		console.error(e);
		edit_album_delete.value = "Error!";
	}
	
	disableAlbum(false);
});

const add_album_el = document.getElementById("add-album");
add_album_el.addEventListener("click", editAlbum);

edit_album_src.addEventListener("change", validateAlbum);
edit_album_title.addEventListener("change", validateAlbum);
edit_album_artwork_url.addEventListener("change", validateAlbum);


// ################### Album Tracks Autofill Metadata ###################
edit_album_autofill.addEventListener("click", async function(){
	if(!await window.confirm("Submit album and autofill tracks?\nWARNING: This will remove all current tracks.")) return;
	edit_album_form.dispatchEvent(new CustomEvent("submit",{detail:{autofill:true}}));
});

// ################### Handle Form Submit and Reset ###################
function disableAlbum(disabled = true){
	edit_album_meta.disabled = disabled;
	edit_album_meta_btn.disabled = disabled;

	edit_album_inputs.forEach(function(el){
		el.disabled = disabled;
	});

	edit_album_reset.disabled = disabled;
}

edit_album_form.addEventListener("submit", async function(e){
	e.preventDefault();
	if(!validateAlbum()) return;
	disableAlbum();
	
	const autofill_tracks = e.detail? e.detail.autofill: false;
	if(autofill_tracks){
		edit_album_autofill.value = "(This may take a while...)";
	}else{
		edit_album_submit.value = "Submitting...";
	}
	edit_album_submit.disabled = true;
	edit_album_autofill.disabled = true;
	edit_album_delete.disabled = true;
	
	const album = {
		id: edit_album_id.value === ''? '': Number(edit_album_id.value),
		src: edit_album_src.value,
		title: edit_album_title.value,
		artwork_url: edit_album_artwork_url.value,
		artwork_path: edit_album_artwork_path.value,
	}
	try{
		if(album.id){
			await album_table.update(album);
		}else{
			await album_table.insert(album);
		}
		if(autofill_tracks && album.src && album.id){
			const response = await yt_dlp(album.src, true);
			const where = [{key:"album",op:"=",value:album.id}];
			const tracks = await track_table.select({where});
			await Promise.all(tracks.map(function(track){
				return track_table.remove(track);
			}));
			if(response.formats){
				const track = {
					src: response.webpage_url || response.original_url || "",
					title: response.track || response.fulltitle || response.title || "",
					duration: response.duration? Math.ceil(response.duration): "",
					artwork_url: response.thumbnail? response.thumbnail: "",
					album: album.id,
				}
				await track_table.insert(track);
			}else{
				if(response.extractor_key === "SoundcloudSet"){ // TODO fix strange soundcloud behavior
					const queue = new AsyncQueue(8); // poggers
					const responses = await Promise.all(response.entries.map(function(item){
						return queue.enqueue(yt_dlp,item.url);
					}));
					await Promise.all(responses.map(function(response){
						const track = {
							src: response.webpage_url || response.original_url || "",
							title: response.track || response.fulltitle || response.title || "",
							duration: response.duration? Math.ceil(response.duration): "",
							artwork_url: response.thumbnail? response.thumbnail: "",
							album: album.id,
						}
						return track_table.insert(track);
					}));
				}else{
					await Promise.all(response.entries.map(function(item){
						const track = {
							src: item.url,
							title: item.title,
							album: album.id,
						}
						return track_table.insert(track);
					}));	
				}
			}
		}
		edit_album_container.classList.add('hidden');
		edit_album_reset.dispatchEvent(new Event("click"));
	}catch(e){
		console.error(e);
		if(autofill_tracks){
			edit_album_autofill.value = "Error!";
		}else{
			edit_album_submit.value = "Error!";
		}
	}
	
	disableAlbum(false);
	edit_album_delete.disabled = edit_album_id.value? false: true;
});
edit_album_reset.addEventListener("click", function(e){
	e.preventDefault();
	edit_album_form.reset();
	validateAlbum(false);
});

//################ JSON Upload Container ################
const upload_json_form = upload_json_container.querySelector("form");

const upload_json_type = upload_json_form.querySelector("#upload-type");
const upload_json_file = upload_json_form.querySelector("#upload-file");
const upload_json_text = upload_json_form.querySelector("#upload-text");

const upload_json_reset = upload_json_form.querySelector("input[type=reset]");
const upload_json_submit = upload_json_form.querySelector("input[type=submit]");

function resetJSON(e){
	if(e) e.preventDefault();
	upload_json_type.value = '';
	upload_json_file.value = '';
	upload_json_text.value = '';
	validateJSON();
}

function disableJSON(disabled = true){
	upload_json_type.disabled = disabled;
	upload_json_file.disabled = disabled;
	upload_json_text.disabled = disabled;
	upload_json_reset.disabled = disabled;
}

function uploadJSON(){
	resetJSON();
	upload_json_container.classList.remove('hidden');
}

function validateJSON(e){
	let all_valid = true;
	all_valid = all_valid && upload_json_type.value !== '';
	all_valid = all_valid && (upload_json_file.value !== '' || upload_json_text.value !== '');
	upload_json_submit.value = "Submit";
	upload_json_submit.disabled = !all_valid;
	return all_valid;
}
async function readTextFile(file){
	return new Promise(function(res, rej){
		const file_reader = new FileReader()
		file_reader.onload = function(event){
			res(event.target.result)
		};
		file_reader.onerror = rej;
		file_reader.readAsText(file);
	});
}

upload_json_type.addEventListener("change", validateJSON);
upload_json_file.addEventListener("change", validateJSON);
upload_json_text.addEventListener("change", validateJSON);
upload_json_form.addEventListener("reset", resetJSON);
upload_json_form.addEventListener("submit", async function(e){
	e.preventDefault();
	if(!validateJSON()) return;
	
	disableJSON();
	upload_json_submit.value = "Submitting...";
	upload_json_submit.disabled = true;
	
	try{
		const type = upload_json_type.value;
		switch(type){
			case "track":
				if(upload_json_file.files.length > 0){
					const result = await readTextFile(upload_json_file.files[0]);
					const track = JSON.parse(result);
					await track_table.insert(track);
				}
				if(upload_json_text.value){
					const track = JSON.parse(upload_json_text.value);
					await track_table.insert(track);
				}
				break;
			case "album":
				if(upload_json_file.files.length > 0){
					const result = await readTextFile(upload_json_file.files[0]);
					const album = JSON.parse(result);
					await album_table.insert(album);
					if(album.tracks) await Promise.all(album.tracks.map(function(track){
						track.album = album.id;
						return track_table.insert(track);
					}));
				}
				if(upload_json_text.value){
					const album = JSON.parse(upload_json_text.value);
					await album_table.insert(album);
					if(album.tracks) await Promise.all(album.tracks.map(function(track){
						track.album = album.id;
						return track_table.insert(track);
					}));
				}
				break;
		}
		upload_json_container.classList.add('hidden');
		resetJSON();
	}catch(e){
		console.error(e);
		upload_json_submit.value = "Error!";
	}
	disableJSON(false);
});


//################ Info Container ################
function openInfo(){
	info_container.classList.remove('hidden');
}

export { editTrack, editAlbum, uploadJSON, openInfo };