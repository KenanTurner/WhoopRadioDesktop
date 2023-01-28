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
const { Command } = window.__TAURI__.shell;
const { convertFileSrc } = window.__TAURI__.tauri;
export function pathToSrc(path){
	return convertFileSrc(path, "stream");
}
export async function yt_dlp(url, is_album = false){
	const binary_path = "binaries/yt-dlp";
	const fixed_args = is_album? ["-J", "-f", "bestaudio", "--flat-playlist"]: ["-j", "-f", "bestaudio", "-I", "1:1"];
	const command = Command.sidecar(binary_path, [...fixed_args, url]);
	const output = await command.execute();
	if(output.code !== 0) throw new Error(output.stderr);
	output.json = JSON.parse(output.stdout);
	console.debug("yt_dlp", output);
	return output.json;
}