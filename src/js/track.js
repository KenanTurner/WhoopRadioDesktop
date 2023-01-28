import Component from '/js/component.js';
import { track_table } from '/js/database.js';
import { player, queue } from '/js/player.js';
import { editTrack } from '/js/edit.js';
const track_html = await (await fetch('/template-track.html')).text();
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
export default class TrackComponent extends Component{
	constructor(track){
		super(track_html);
		
		this._track = {id: track.id};
		this._update({track});
		this.dataset.id = track.id;
		
		if(player.state.track && player.state.track.id === track.id) this.classList.add('playing');
		player.observer.subscribe('track',{callback:function({value:track}){
			const {id} = this._track;
			if(track.id === id){
				this.classList.add('playing');
			}else{
				this.classList.remove('playing');
			}
		}.bind(this)});
		
		this._edit_btn = this.shadowRoot.querySelector("#edit-btn");
		
		this.addEventListener("click", this._onClick.bind(this));
		this._edit_btn.addEventListener("click", function(e){
			e.stopPropagation();
			this._edit();
		}.bind(this));
		
		track_table.subscribe("update",{callback:this._update}, this);
		track_table.subscribe("remove",{callback:this._remove}, this);
	}
	async _onClick(){
		const where = [{key:"id",op:"=",value:this._track.id}];
		const [track] = await track_table.select({where});
		
		const index = queue.findIndex(function({id}){
			return track.id === id;
		}.bind(this));
		if(index >= 0){
			queue.index = index;
		}else{
			queue.push(track); // TODO push instead?
			queue.index = queue.length - 1;
		}
	}
	async _edit(){
		const where = [{key:"id",op:"=",value:this._track.id}];
		const [track] = await track_table.select({where});
		editTrack(track);
	}
	_update({track}){
		const {id, title, src, artwork_url} = track;
		if(this._track.id !== id) return;
		if(this._track.title !== title){
			const slot = this.querySelector("[slot=\"track-title\"]");
			if(title && !slot){
				const title_el = createElement("span",{ slot: "track-title" });
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
		// TODO display path if available
		if(this._track.src !== src){
			const slot = this.querySelector("[slot=\"track-src\"]");
			if(src && !slot){
				const src_el = createElement("span",{ slot: "track-src" });
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
		if(this._track.artwork_url !== artwork_url){
			const slot = this.querySelector("[slot=\"track-image\"]");
			if(artwork_url && !slot){
				const img_el = createElement("img",{ src: artwork_url, slot: "track-image" });
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
		this._track = track;
	}
	_remove({track}){
		const {id} = track;
		if(this._track.id === id) this.remove();
	}
	remove(){
		track_table.unsubscribe("update",{callback:this._update}, this);
		track_table.unsubscribe("remove",{callback:this._remove}, this);
		return super.remove(...arguments);
	}
}
customElements.define('track-row',TrackComponent);

class AddTrackComponent extends Component{
	constructor(){
		super(track_html);
	}
}
customElements.define('add-track',AddTrackComponent);