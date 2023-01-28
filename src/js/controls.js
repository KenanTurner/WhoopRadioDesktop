import EventTarget from '/js/event-target.js';
import {album_table} from '/js/database.js';
import {player, queue, queue_observer} from '/js/player.js';
import { uploadJSON, openInfo } from '/js/edit.js';

const user_input = EventTarget.observe({'paused':true});
export { user_input };

//###################### queue controls ######################
queue_observer.subscribe("index", {callback: async function({value:index}){
	if(!queue.length === 0 || !queue[index]) return;
	await player.load(queue[index]);
	if(user_input.state.paused){
		await player.pause();
	}else{
		await player.play();
	}
}});
queue_observer.subscribe("next", {callback: async function(){
	if(!queue.length === 0 || !queue[queue.index]) return;
	await player.load(queue[queue.index]);
	if(queue.index == 0) user_input.state.paused = true;
	if(user_input.state.paused){
		await player.pause();
	}else{
		await player.play();
	}
}});
queue_observer.subscribe("previous", {callback: async function(){
	if(!queue.length === 0 || !queue[queue.index]) return;
	await player.load(queue[queue.index]);
	if(user_input.state.paused){
		await player.pause();
	}else{
		await player.play();
	}
}});

//###################### keyboard controls ######################
document.addEventListener("keydown", function(e){ //prevent defaults
	if(e.target.tagName === "INPUT") return;
	if([' ', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) > -1) e.preventDefault();
});
const keyEvent = function(e,key_code,f,...args){
	document.addEventListener(e, function(e){
		if(e.key === key_code && e.target.tagName !== "INPUT") return f(...args);
	}, false);
}
keyEvent('keyup',' ',function(){
	user_input.state.paused = !user_input.state.paused;
    player.enqueue(user_input.state.paused? "pause": "play");
});
keyEvent('keyup','l',function(){
    player.loop(!player.state.loop);
});
keyEvent('keyup','m',function(){
    player.mute(!player.state.muted);
});
keyEvent('keyup','s',function(){
    queue.shuffled = !queue.shuffled;
});
keyEvent('keydown','ArrowRight',player.enqueue.bind(player,'fastForward',5));
keyEvent('keydown','ArrowLeft',player.enqueue.bind(player,'fastForward',-5));
function clamp(min, number, max){ return Math.max(min, Math.min(number, max)); }
keyEvent('keyup','ArrowUp',function(){
	player.enqueue('volume',clamp(0, player.state.volume + 0.1, 1));
});
keyEvent('keyup','ArrowDown',function(){
	player.enqueue('volume',clamp(0, player.state.volume - 0.1, 1));
});
[0,1,2,3,4,5,6,7,8,9].forEach(function(i){
	keyEvent('keyup',String(i),function(){
		if(isFinite(player.state.duration)){
			player.enqueue('seek',i * player.state.duration / 10);
		}
	});
})
keyEvent('keyup','.',queue.next.bind(queue));
keyEvent('keyup',',',queue.previous.bind(queue));

// imported from edit.js
keyEvent('keyup','j',uploadJSON);
keyEvent('keyup','i',openInfo);

// open queue window
keyEvent('keyup','q',function(){
	const queue_container = document.getElementById("queue-container");
	if(!queue_container.classList.contains("hidden")) return; // return if already open
	const queue_btn = document.querySelector("#controls #queue");
	queue_btn.dispatchEvent(new CustomEvent("click", {detail:{update_history:true}}));
});


//###################### Media Session ######################
if ('mediaSession' in navigator) {
	console.log("Using mediaSession");
	const session = window.top.navigator.mediaSession;
    user_input.observer.subscribe("paused",{callback:function({value: is_paused}){
        try{
            session.playbackState = is_paused? "paused": "playing";
        }catch(e){
            console.error("mediaSession failed to set playbackState: ",e);
        }
    }});
    player.observer.subscribe("track",{callback:async function({value: track}){
        try{
			const { id, title, album: album_id } = track;
			const where = [{key:"id",op:"=",value:album_id}];
			const [album] = await album_table.select({where});
			const metadata = {
				title: track.title,
				album: album.title,
			}
			if(track.artwork_url){
				metadata.artwork = [{ src: track.artwork_url, type: 'image/png'}];
			}else{
				if(album.artwork_url) metadata.artwork = [{ src: album.artwork_url, type: 'image/png'}];
			}
			
            session.metadata = new MediaMetadata(metadata);
        }catch(e){
            console.error("mediaSession failed to set metadata: ",e);
        }
    }});
    player.observer.subscribe("src",{callback:function({value: src}){
        try{
            const actionHandler = function({action, seekOffset, seekTime}){
                switch(action){
                    case "play":
                        player.play(); // TODO use enqueue instead?
						user_input.state.paused = false;
                        break;
                    case "pause":
                        player.pause();
						user_input.state.paused = true;
                        break;
                    case "stop":
                        player.stop();
                        break;
                    case "seekbackward":
                        player.fastForward(seekOffset || -5);
                        break;
                    case "seekforward":
                        player.fastForward(seekOffset || 5);
                        break;
                    case "seekto":
                        player.seek(seekTime);
                        break;
					case "previoustrack":
						queue.previous();
						break;
					case "nexttrack":
						queue.next();
						break;
                }
            }
            session.setActionHandler('play', actionHandler);
            session.setActionHandler('pause', actionHandler);
            session.setActionHandler('stop', actionHandler);
            session.setActionHandler('seekbackward', actionHandler);
            session.setActionHandler('seekforward', actionHandler);
            session.setActionHandler('seekto', actionHandler);
			session.setActionHandler('previoustrack', actionHandler);
			session.setActionHandler('nexttrack', actionHandler);
        }catch(e){
            console.error("mediaSession failed to initialize: ",e);
        }
    }, once: true});
    player.observer.subscribe("time",{callback:function({value: time}){
        try{
            session.setPositionState({
               duration: Number.isFinite(player.state.duration)? player.state.duration: time,
               playbackRate: 1.0,
               position: time,
            });
        }catch(e){
            console.error("mediaSession failed to setPositionState: ",e);
        }
    }});
}else{
	console.log("mediaSession is unsupported");
}

// ########################### PROGRESS AND TITLE ###########################
const current_time = document.querySelector("#state-time");
const current_duration = document.querySelector("#state-duration");
const title_container = document.querySelector("#title-container");
const title_div = document.querySelector("#state-title");
const progress_bar = document.querySelector("#progress-bar");
const progress_bar_elapsed = document.querySelector("#progress-bar #elapsed");
const progress_bar_remaining = document.querySelector("#progress-bar #remaining");

player.observer.subscribe("time", {callback: function({value: time}){
    current_time.innerText = new Date(time * 1000).toISOString().substr(14, 5);
}});
player.observer.subscribe("duration", {callback: function({value: time}){
    current_duration.innerText = new Date(Number.isFinite(time)? time * 1000: 0).toISOString().substr(14, 5);
}});
player.observer.subscribe("time", {callback: function({value: time}){
	let duration = player.state.duration || 0;
	if(time > duration || !isFinite(duration)) return;
	let p = 100*time/duration;
	progress_bar_elapsed.style.width = String(p)+"%";
	progress_bar_remaining.style.width = String(100-p)+"%";
}});
title_container.addEventListener('click', async function(e){
    const rect = progress_bar.getBoundingClientRect();
	let p = (e.clientX - rect.left) / rect.width;
	if(player.state.duration && isFinite(player.state.duration)) player.seek(player.state.duration*p);
});
player.observer.subscribe("track", {callback: function({value: track}){
	const { title } = track;
	title_div.innerText = title;
	title_container.title = title;
}});

// ########################### BOTTOM ###########################
const info_btn = document.querySelector("#controls #info");
const queue_btn = document.querySelector("#controls #queue");
const loop_checkbox = document.querySelector("#controls #loop");
const previous_btn = document.querySelector("#controls #previous");
const rewind_btn = document.querySelector("#controls #rewind");
const play_btn = document.querySelector("#controls #play");
const forward_btn = document.querySelector("#controls #forward");
const next_btn = document.querySelector("#controls #next");
const shuffle_btn = document.querySelector("#controls #shuffle");
const mute_checkbox = document.querySelector("#controls #mute");

info_btn.addEventListener('click', openInfo);

queue_btn.addEventListener('click', function(e){
	const queue_container = document.getElementById("queue-container");
	if(!queue_container.classList.contains("hidden")) return;
	const track_container = document.getElementById("track-container");
	const album_container = document.getElementById("album-container");
	track_container.classList.add("hidden");
	album_container.classList.add("hidden");
	queue_container.classList.remove("hidden");
	if(e instanceof CustomEvent && !e.detail.update_history) return;
	window.history.pushState({queue:true},'',`?queue=true`);
});
loop_checkbox.addEventListener('click', function(e){
	player.loop(!player.state.loop);
});
player.observer.subscribe("loop", {callback: function({value: will_loop}){
    loop_checkbox.classList[will_loop? "add": "remove"]("highlight");
}});

previous_btn.addEventListener('click',queue.previous.bind(queue));
rewind_btn.addEventListener('click',player.enqueue.bind(player, "fastForward", -10));

play_btn.addEventListener('click',function(e){
	user_input.state.paused = !user_input.state.paused;
    player.enqueue(user_input.state.paused? "pause": "play");
});
user_input.observer.subscribe("paused", {callback: function({value: is_paused}){
    play_btn.children[0].href.baseVal = is_paused? "/images/sprite.min.svg#media-play": "/images/sprite.min.svg#media-pause";
}});

forward_btn.addEventListener('click',player.enqueue.bind(player, "fastForward", 10));
next_btn.addEventListener('click',queue.next.bind(queue));

shuffle_btn.addEventListener('click', function(e){
	queue.shuffled = !queue.shuffled;
});
queue_observer.subscribe("shuffled", {callback: function({value: shuffled}){
	queue[shuffled? "shuffle": "unshuffle"]();
    shuffle_btn.classList[shuffled? "add": "remove"]("highlight");
}});
mute_checkbox.addEventListener('click', function(e){
	player.mute(!player.state.muted);
});
player.observer.subscribe("muted", {callback: function({value: is_muted}){
    mute_checkbox.children[0].href.baseVal = is_muted? "/images/sprite.min.svg#volume-off": "/images/sprite.min.svg#volume-high";
}});
player.observer.subscribe("volume", {callback: function({value: volume}){
	if(player.state.muted) return;
	if(volume < 0.1){
		mute_checkbox.children[0].href.baseVal = "/images/sprite.min.svg#volume-off";
	}
	if(volume >= 0.1 && volume <= 0.5){
		mute_checkbox.children[0].href.baseVal = "/images/sprite.min.svg#volume-low";
	}
	if(volume > 0.5){
		mute_checkbox.children[0].href.baseVal = "/images/sprite.min.svg#volume-high";
	}
}});

// ########################### FIX MARGINS ###########################
const controls_container = document.querySelector(".controls-container");
const resize_observer = new ResizeObserver(function(entries, observer){
	for(const entry of entries){
		window.document.body.style.marginBottom = entry.target.clientHeight + "px";
	}
});
resize_observer.observe(controls_container);