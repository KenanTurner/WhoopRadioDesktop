import Component from '/js/component.js';
import TrackComponent from '/js/track.js';
import { album_table, track_table } from '/js/database.js';
import { queue, queue_observer } from '/js/player.js';
import { user_input } from '/js/controls.js';
import { editAlbum } from '/js/edit.js';

const icon_html = await (await fetch('/template-album-icon.html')).text();
const header_html = await (await fetch('/template-album-header.html')).text();

function createElement(tag_name,options = {}, class_list = [],child_nodes = []){
	let el = document.createElement(tag_name);
	for(let key in options){
		el.setAttribute(key,options[key]);
	}
	class_list.forEach(function(cl){
		el.classList.add(cl);
	});
	child_nodes.forEach(function(node){
		el.appendChild(node);
	});
	return el;
}
export class AlbumIcon extends Component{
	constructor(album){
		super(icon_html);
		
		this._album = {id: album.id};
		this._update({album});
		this.dataset.album = album.id;

		album_table.subscribe("update",{callback:this._update}, this);
		album_table.subscribe("remove",{callback:this._remove}, this);
		
		this.addEventListener("click", this._onClick.bind(this));
	}
	_update({album}){
		const {id, title, artwork_url} = album;
		if(this._album.id !== id) return;
		if(this._album.artwork_url !== artwork_url){
			const slot = this.querySelector("[slot=\"album-image\"]");
			if(artwork_url && !slot){
				const img_el = createElement("img",{ src: artwork_url, slot: "album-image" });
				img_el.addEventListener('error',img_el.remove.bind(img_el));
				this.appendChild(img_el);
			}
			if(artwork_url && slot){
				slot.src = artwork_url;
			}
			if(!artwork_url && slot){
				slot.remove();
			}
		}
		if(this._album.title !== title){
			const slot = this.querySelector("[slot=\"album-title\"]");
			if(title && !slot){
				const title_el = createElement("span",{ slot: "album-title" });
				title_el.innerText = title;
				this.appendChild(title_el);
			}
			if(title && slot){
				slot.innerText = title;
			}
			if(!title && slot){
				slot.remove();
			}
			this.title = title;
		}
		this._album = album;
	}
	_remove({album}){
		const {id} = album;
		if(this._album.id === id) this.remove();
	}
	async _onClick(update_history = true){
		const track_container = document.getElementById("track-container");
		const album_container = document.getElementById("album-container");
		const queue_container = document.getElementById("queue-container");
		album_container.classList.add("hidden");
		queue_container.classList.add("hidden");
		document.querySelectorAll("#track-container track-row:not(#add-track),album-row").forEach(function(el){
			el.remove();
		});
		// while(track_container.firstChild){ track_container.lastChild.remove(); }
		const add_track_el = document.getElementById("add-track");
		
		let where = [{key:"id",op:"=",value:this._album.id}];
		const [album] = await album_table.select({where});
		where = [{key:"album",op:"=",value:this._album.id}];
		const tracks = await track_table.select({where});
			
		const header = new AlbumHeader(album);
		track_container.insertBefore(header, add_track_el);
		
		tracks.forEach(function(track){
			const track_el = new TrackComponent(track);
			track_container.insertBefore(track_el, add_track_el);
		});
		
		track_container.classList.remove("hidden");
		
		if(update_history) window.history.pushState({id:album.id},'',`?album=${ album.id }`);
	}
	remove(){
		album_table.unsubscribe("update",{callback:this._update}, this);
		album_table.unsubscribe("remove",{callback:this._remove}, this);
		return super.remove(...arguments);
	}
}
customElements.define('album-icon',AlbumIcon);

class AddAlbumIcon extends Component{
	constructor(){
		super(icon_html);
	}
}
customElements.define('add-album', AddAlbumIcon);

export class AlbumHeader extends Component{
	constructor(album){
		super(header_html);
		
		this._album = {id: album.id};
		this._update({album});
		this.dataset.album = album.id;
		
		this._home_btn = this.shadowRoot.querySelector("#home-btn");
		this._load_btn = this.shadowRoot.querySelector("#load-btn");
		this._edit_btn = this.shadowRoot.querySelector("#edit-btn");
		this._download_btn = this.shadowRoot.querySelector("#download-btn");
		
		this._home_btn.addEventListener("click", this._back.bind(this));
		this._load_btn.addEventListener("click", this._load.bind(this));
		this._edit_btn.addEventListener("click", this._edit.bind(this));
		this._download_btn.addEventListener("click", this._download.bind(this));
		
		track_table.subscribe("insert",{callback:this._insert}, this);
		album_table.subscribe("update",{callback:this._update}, this);
		album_table.subscribe("remove",{callback:this._remove}, this);
	}
	_back(){
		window.history.back();
	}
	async _load(){
		const where = [{key:"album",op:"=",value:this._album.id}];
		const tracks = await track_table.select({where});
		user_input.state.paused = false;
		queue.length = 0;
		queue.push(...tracks);
		if(queue.shuffled) queue.shuffle(true);
		queue.index = 0;
	}
	async _edit(){
		const where = [{key:"id",op:"=",value:this._album.id}];
		const [album] = await album_table.select({where});
		editAlbum(album);
	}
	_insert({track}){
		if(track.album !== this._album.id) return;
		if(track.album !== Number(document.querySelector("album-row").dataset.album)) return;
		const track_container = document.getElementById("track-container");
		const add_track_el = document.getElementById("add-track");
		
		const track_el = new TrackComponent(track);
		track_container.insertBefore(track_el, add_track_el);
	}
	_update({album}){
		const {id, title, src, artwork_url} = album;
		if(this._album.id !== id) return;
		if(this._album.title !== title){
			const slot = this.querySelector("[slot=\"album-title\"]");
			if(title && !slot){
				const title_el = createElement("span",{ slot: "album-title" });
				title_el.innerText = title;
				this.appendChild(title_el);
			}
			if(title && slot){
				slot.innerText = title;
			}
			if(!title && slot){
				slot.remove();
			}
			this.title = title;
		}
		if(this._album.src !== src){
			const slot = this.querySelector("[slot=\"album-src\"]");
			if(src && !slot){
				const src_el = createElement("span",{ slot: "album-src" });
				src_el.innerText = src;
				this.appendChild(src_el);
			}
			if(src && slot){
				slot.innerText = src;
			}
			if(!src && slot){
				slot.remove();
			}
		}
		if(this._album.artwork_url !== artwork_url){
			const slot = this.querySelector("[slot=\"album-image\"]");
			if(artwork_url && !slot){
				const img_el = createElement("div",{ slot: "album-image", });
				img_el.style.backgroundImage = `url("${ artwork_url }")`;
				img_el.addEventListener('error',img_el.remove.bind(img_el));
				this.appendChild(img_el);
			}
			if(artwork_url && slot){
				slot.src = artwork_url;
			}
			if(!artwork_url && slot){
				slot.remove();
			}
		}
		this._album = album;
	}
	_remove({album}){
		const {id} = album;
		if(this._album.id === id) this.remove();
	}
	remove(){
		track_table.unsubscribe("insert",{callback:this._insert}, this);
		album_table.unsubscribe("update",{callback:this._update}, this);
		album_table.unsubscribe("remove",{callback:this._remove}, this);
		return super.remove(...arguments);
	}
	async _download(){
		const where = [{key:"id",op:"=",value:this._album.id}];
		const [album] = await album_table.select({where});
		where[0].key = "album";
		album.tracks = await track_table.select({where});
		const str = JSON.stringify(album, null, "\t");
		
		const a = document.createElement("a");
		const url = URL.createObjectURL(new Blob([str], {type:"application/json"}));
		a.href = url;
		a.download = album.title.replace(/[/\\?%*:|"<>]/g, ' ');
		a.click();
	}
};
customElements.define('album-row',AlbumHeader);

class QueueHeader extends Component{
	constructor(){
		super(header_html);
		
		this._home_btn = this.shadowRoot.querySelector("#home-btn");
		this._load_btn = this.shadowRoot.querySelector("#load-btn");
		this._edit_btn = this.shadowRoot.querySelector("#edit-btn");
		this._download_btn = this.shadowRoot.querySelector("#download-btn");
		this._edit_btn.remove();
		
		this._home_btn.addEventListener("click", this._back.bind(this));
		this._load_btn.addEventListener("click", this._load.bind(this));
		this._download_btn.addEventListener("click", this._download.bind(this));
		
		queue_observer.subscribe("push",{callback:function(){
			const queue_container = document.getElementById("queue-container");
			queue.forEach(function(track){
				const track_el = new TrackComponent(track);
				queue_container.appendChild(track_el);
			});
		}});
		queue_observer.subscribe("length",{callback:function({value:length}){
			const queue_container = document.getElementById("queue-container");
			while(queue_container.childElementCount !== length + 1){
				queue_container.lastChild.remove();
			}
		}});
		queue_observer.subscribe("shuffle",{callback:function(){
			const queue_container = document.getElementById("queue-container");
			queue.forEach(function(track){
				const track_el = queue_container.querySelector(`track-row[data-id="${ track.id }"]`);
				queue_container.appendChild(track_el);
			});
		}});
		queue_observer.subscribe("unshuffle",{callback:function(){
			const queue_container = document.getElementById("queue-container");
			queue.forEach(function(track){
				const track_el = queue_container.querySelector(`track-row[data-id="${ track.id }"]`);
				queue_container.appendChild(track_el);
			});
		}});
	}
	_back(){
		window.history.back();
	}
	async _load(){
		queue.index = 0;
	}
	async _download(){
		const album = {title:"Up Next:"}
		album.tracks = [...queue];
		const str = JSON.stringify(album, null, "\t");
		
		const a = document.createElement("a");
		const url = URL.createObjectURL(new Blob([str], {type:"application/json"}));
		a.href = url;
		a.download = album.title.replace(/[/\\?%*:|"<>]/g, ' ');
		a.click();
	}
}
customElements.define('queue-row', QueueHeader);