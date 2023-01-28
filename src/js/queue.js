export default class IndexArray extends Array{
	constructor(){
		super();
		this.index = 0;
		this.shuffled = false;
	}
	unshuffle(){
		this.sort(function(a,b){
			return a.id - b.id;
		});
		this.shuffled = false;
	}
	shuffle(shuffle_index = false){
		if(shuffle_index){
			//shuffle all items
			let items_to_shuffle = this.length;
			while(items_to_shuffle != 0){
				let rand_index = Math.floor(Math.random() * items_to_shuffle);
				items_to_shuffle--;
				[this[items_to_shuffle], this[rand_index]] = [this[rand_index], this[items_to_shuffle]];
			}
		}else{
			//shuffle before index
			let items_to_shuffle = this.index;
			while(items_to_shuffle != 0){
				let rand_index = Math.floor(Math.random() * items_to_shuffle);
				items_to_shuffle--;
				[this[items_to_shuffle], this[rand_index]] = [this[rand_index], this[items_to_shuffle]];
			}
			//shuffle after index
			items_to_shuffle = this.length - this.index - 1; // don't shuffle index
			while(items_to_shuffle > 0){
				let rand_index = Math.floor(Math.random() * items_to_shuffle) + this.index + 1;
				let swap_index = items_to_shuffle + this.index;
				items_to_shuffle--;
				[this[swap_index], this[rand_index]] = [this[rand_index], this[swap_index]];
			}
		}
		this.shuffled = true;
	}
	next(){
		const mod = function(n, m) {return ((n % m) + m) % m;}
		this.index = mod(this.index+1, this.length);
	}
	previous(){
		const mod = function(n, m) {return ((n % m) + m) % m;}
		this.index = mod(this.index-1, this.length);
	}
}