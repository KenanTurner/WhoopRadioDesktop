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
function extToMimeType(ext){
	// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers#browser_compatibility
	switch(ext){
		case "mpg":
			return "audio/mpeg";
		case "m4a":
			return "audio/mp4";
		case "oga":
			return "audio/ogg";
		default:
			return "audio/"+ext;
	}
}
import { yt_dlp } from '/js/tauri.js';
import Player from '/js/default.js';
export default class YoutubePlayer extends Player{
	async load(track){
		const {src} = track;
		if(!src) return super.load(track);
		let response;
		try{
			response = await yt_dlp(src);
		}catch(e){
			console.error(e);
			return super.load(track);
		}
		const sources = response.formats? response.formats.filter(function(resource){
			return (
				resource.resolution == "audio only" &&
				(resource.protocol == "http" || resource.protocol == "https" || resource.protocol == "http_dash_segments")
			)
		}).map(function(resource){
			return {
				src: resource.fragment_base_url? resource.fragment_base_url: resource.url,
				type: extToMimeType(resource.ext),
			};
		}).reverse(): [];
		return super.load({...track, src:response.url, sources});
	}
}