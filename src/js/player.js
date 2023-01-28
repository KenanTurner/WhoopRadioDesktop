import EventTarget from '/js/event-target.js';
import DefaultPlayer from '/js/default.js';
import YoutubePlayer from '/js/youtube.js';
import LocalPlayer from '/js/local.js';
import Queue from '/js/queue.js';

// ############ PLAYER ############
const player = new LocalPlayer();
player.observer.subscribe('error',{callback:function(err){
	console.error(err);
}});
player.observer.subscribe('all',{callback:function(e){console.debug(e)}});

// ############ QUEUE ############
const {state:queue, observer:queue_observer} = EventTarget.observe(new Queue());
player.observer.subscribe('ended',{callback:async function({value:ended}){
	if(ended) queue.next();
}});

export {player, queue, queue_observer};