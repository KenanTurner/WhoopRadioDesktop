/*
 *  This file is part of the MetaMusic library (https://github.com/KenanTurner/MetaMusic)
 *  Copyright (C) 2022  Kenan Turner
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import EventTarget from '/js/event-target.js';
import AsyncQueue from '/js/async-queue.js';
export default class Default extends AsyncQueue{
	constructor(){
		super();
		({observer:this.observer, state:this.state} = EventTarget.observe({
			'src':'',
			'time':0.0,
			'duration':0.0,
			'volume':1.0,
			'paused':true,
			'muted':false,
			'loop':false,
			'shuffle':false,
			'ended':false,
			'error':null,
			'track': null,
		}));
		this._player = new Audio();
		this._player.addEventListener('pause',function(e){
			this.state.paused = this._player.paused;
		}.bind(this));
		this._player.addEventListener('play',function(e){
			this.state.paused = this._player.paused;
		}.bind(this));
		this._player.addEventListener('ended',function(e){
			this.state.ended = this._player.ended;
		}.bind(this));
		this._player.addEventListener('timeupdate',function(e){
			this.state.time = this._player.currentTime
		}.bind(this));
		this._player.addEventListener('durationchange',function(e){
			this.state.duration = this._player.duration
		}.bind(this));
		this._player.addEventListener('volumechange',function(e){
			this.state.volume = this._player.volume
		}.bind(this));
		this._player.addEventListener('error',function(e){
			this.state.error = this._player.error
		}.bind(this));
	}
	async load(track){
		const {src, sources} = track;
		await new Promise(function(res,rej){
			this._player.addEventListener('error',rej,{once:true});
			this._player.addEventListener('canplay',res,{once:true});
			setTimeout(rej.bind(null,"Load Timeout!"),10*1000); // 10 seconds
			if(sources){
				while(this._player.firstChild){ this._player.lastChild.remove(); }
				sources.forEach(function({src,type}){
					let source = document.createElement("source");
					source.src = src;
					source.type = type;
					this._player.appendChild(source);
				}.bind(this));
				if(!src) this._player.src = sources[0].src;
			}
			if(src){
				this._player.src = src;
			}
			this._player.load();
		}.bind(this));
		this.state.src = this._player.currentSrc;
		this.state.track = track;
	}
	async play(){
		await this._player.play();
	}
	async pause(){
		await this._player.pause(); // TODO pause returns undefined
	}
	async seek(time){
		this._player.currentTime = time;
	}
	async fastForward(time){
		return this.seek(this.state.time + time);
	}
	async volume(vol){
		this._player.volume = vol;
	}
	async mute(bool){
		this._player.muted = bool;
		this.state.muted = bool;
	}
	async loop(bool){
		this._player.loop = bool;
		this.state.loop = bool;
	}
	async stop(){
		await this.pause();
		await this.seek(0);
	}
}