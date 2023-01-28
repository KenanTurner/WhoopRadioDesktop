import EventTarget from '/js/event-target.js';
import {db, track_table, album_table} from '/js/database.js';
import { player, queue, queue_observer } from '/js/player.js';
import { AlbumIcon } from '/js/album.js';

let imports = {db, track_table, album_table, player, queue, queue_observer, EventTarget};
function map(src,dest={},key=function(k){return k},value=function(v){return v}){for(let k in src){dest[key(k)] = value(src[k]);};return dest;}
map(imports,window);
console.log("Imports Loaded");

// ############ AlbumIcons ############
const track_container = document.getElementById("track-container");
const album_container = document.getElementById("album-container");
const queue_container = document.getElementById("queue-container");
const albums = await album_table.select({order_by:[{key:"title",value:"ASC"}]});
const add_album_el = document.getElementById("add-album");

albums.forEach(function(album){
    album_container.insertBefore(new AlbumIcon(album), add_album_el);
});
add_album_el.classList.remove("hidden");

// ############ Handle Window History State ############
if(window.history.state){
	const state = window.history.state;
	if(state.id){
		const album_el = document.querySelector(`album-icon[data-album='${ window.history.state.id }'`);
		album_el._onClick(false);
	}else if(state.queue){
		const queue_btn = document.querySelector("#controls #queue");
		queue_btn.dispatchEvent(new CustomEvent("click", {detail:{update_history:false}}));
	}
	else{
		console.error("Unknown state:", state);
	}
}

window.addEventListener('popstate', async function({state}){
	if(state){
		if(state.id){
			const album_el = document.querySelector(`album-icon[data-album='${ state.id }'`);
			album_el._onClick(false);
		}else if(state.queue){
			const queue_btn = document.querySelector("#controls #queue");
			queue_btn.dispatchEvent(new CustomEvent("click", {detail:{update_history:false}}));
		}else{
			console.error("Unknown state:", state);
		}
	}else{
		track_container.classList.add("hidden");
		queue_container.classList.add("hidden");
		const p = scroll_observer.waitForEvent("album_container_height");
		album_container.classList.remove("hidden");
		await p;
		window.scrollTo(0, scroll_state.last_scroll_position);
	}
});

// ############ Handle Insertion/Removal of Albums ############
album_table.subscribe("remove", {callback: async function({album}){
	const index = albums.findIndex(function(item){
		return album.id === item.id;
	});
	albums.splice(index, 1);
}});
album_table.subscribe("insert", {callback: async function({album}){
	// console.log(...args);
	albums.push(album);
	albums.sort(function(a, b){
		return a.title.localeCompare(b.title);
	});
	const index = albums.indexOf(album);
	switch(index){
		case 0:
			album_container.prepend(new AlbumIcon(album));
			break;
		case albums.length - 1:
			album_container.insertBefore(new AlbumIcon(album), add_album_el);
			break;
		default:
			const next_album = albums[index + 1];
			const next_album_icon = album_container.querySelector(`album-icon[data-album="${ next_album.id }"]`)
			album_container.insertBefore(new AlbumIcon(album), next_album_icon);
			break
	}
}});

// ############ Handle Scroll State ############
const {state:scroll_state, observer:scroll_observer} = EventTarget.observe({last_scroll_position:0, album_container_height: album_container.clientHeight});
const resize_observer = new ResizeObserver(function(entries, observer){
	for(const entry of entries){
		scroll_state.album_container_height = entry.target.clientHeight;
	}
});
resize_observer.observe(album_container);
document.addEventListener("scroll", function(e){
    if(album_container.classList.contains("hidden")) return;
    scroll_state.last_scroll_position = window.scrollY;
});
window.scroll_state = scroll_state;
window.scroll_observer = scroll_observer;