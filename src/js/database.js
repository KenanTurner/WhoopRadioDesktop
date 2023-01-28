const { emit, listen } = window.__TAURI__.event;
import Database from '/js/tauri-plugin-sql.min.js';
import EventTarget from '/js/event-target.js';
const db = await Database.load('sqlite:db.sqlite'); // see C:\Users\[USER]\AppData\Roaming\WhoopRadio
await db.execute('PRAGMA foreign_keys = on');
// await db.execute("DROP TABLE IF EXISTS tracks;");
// await db.execute("DROP TABLE IF EXISTS albums;");
await db.execute(
	`CREATE TABLE IF NOT EXISTS tracks (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		src TEXT NOT NULL,
		path TEXT,
		title TEXT NOT NULL,
		album INTEGER NOT NULL,
		duration INTEGER,
		artwork_url TEXT,
		artwork_path TEXT,
		FOREIGN KEY(album) REFERENCES albums(id)
	);`
);
await db.execute(
	`CREATE TABLE IF NOT EXISTS albums (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		src TEXT,
		artwork_url TEXT,
		artwork_path TEXT
	);`
);
// await db.execute(
	// `CREATE TABLE IF NOT EXISTS playlists (
		// id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		// title TEXT NOT NULL,
		// artwork_url TEXT
	// );`
// );
// await db.execute(
	// `CREATE TABLE IF NOT EXISTS playlist_tracks (
		// playlist_id INTEGER NOT NULL,
		// track_id INTEGER NOT NULL,
		// FOREIGN KEY(playlist_id) REFERENCES playlists(id),
		// FOREIGN KEY(track_id) REFERENCES tracks(id)
	// );`
// );
// await db.execute('INSERT OR IGNORE INTO albums (id, title) VALUES (1, "Unsorted")');

class TrackTable extends EventTarget{
	//fetch
	async fetch(){
		return db.select("SELECT * FROM tracks");
	}
	//select
	async select({keys=[], where=[], order_by=[], limit=-1, offset=-1} = {}){
		return db.select(`SELECT
		${ keys.length? keys.join(","): "*" } FROM tracks 
		${ Object.keys(where).length? "WHERE " + where.map(({key, op, value}) => `${key} ${op} ${typeof(value) == 'string'? `"${value}"`: value}`).join(" AND "): ""}
		${ order_by.length? "ORDER BY " + order_by.map(({key, value}) => `${key} ${value}`).join(","): ""}
		${ limit > 0? "LIMIT " + limit: ""}
		${ offset > 0? "OFFSET " + offset: ""};`);
	}
	//insert
	async insert(track){
		const args = [track.src, track.path, track.title, track.album, track.duration, track.artwork_url,  track.artwork_path];
		const args_str = args.map(function(item,index){
			return item? "$"+(index+1): 'null';
		}).join(",");
		const {rowsAffected, lastInsertId} = await db.execute(`INSERT INTO tracks (src, path, title, album, duration, artwork_url, artwork_path) VALUES (${ args_str })`, args);
		if(rowsAffected <= 0) throw new Error("ERROR: Unable to insert track!",track);
		track.id = lastInsertId;
		emit('db', { table: "tracks", key: "insert", value: track });
		return rowsAffected;
	}
	//update
	async update(track){
		const args = [track.id, track.src, track.path, track.title, track.album, track.duration, track.artwork_url,  track.artwork_path];
		const args_str = args.map(function(item,index){
			return item? "$"+(index+1): 'null';
		}).join(",");
		const {rowsAffected, lastInsertId} = await db.execute(`REPLACE INTO tracks (id, src, path, title, album, duration, artwork_url, artwork_path) VALUES (${ args_str })`, args);
		if(rowsAffected <= 0) throw new Error("ERROR: Unable to update track!",track);
		track.id = lastInsertId;
		emit('db', { table: "tracks", key: "update", value: track });
		return rowsAffected;
	}
	//remove
	async remove(track){
		const {rowsAffected, lastInsertId} = await db.execute("DELETE FROM tracks WHERE id = $1",[track.id]);
		if(rowsAffected <= 0) throw new Error("ERROR: Unable to remove track!",track);
		emit('db', { table: "tracks", key: "remove", value: track });
		return rowsAffected;
	}
}

class AlbumTable extends EventTarget{
	//fetch
	async fetch(){
		return db.select("SELECT * FROM albums");
	}
	//select
	async select({keys=[], where=[], order_by=[], limit=-1, offset=-1} = {}){
		return db.select(`SELECT
		${ keys.length? keys.join(","): "*" } FROM albums 
		${ Object.keys(where).length? "WHERE " + where.map(({key, op, value}) => `${key} ${op} ${typeof(value) == 'string'? `"${value}"`: value}`).join(" AND "): ""}
		${ order_by.length? "ORDER BY " + order_by.map(({key, value}) => `${key} ${value}`).join(","): ""}
		${ limit > 0? "LIMIT " + limit: ""}
		${ offset > 0? "OFFSET " + offset: ""};`);
	}
	//insert
	async insert(album){
		const args = [album.title, album.src, album.artwork_url, album.artwork_path];
		const args_str = args.map(function(item,index){
			return item? "$"+(index+1): 'null';
		}).join(",");
		const {rowsAffected, lastInsertId} = await db.execute(`INSERT INTO albums (title, src, artwork_url, artwork_path) VALUES (${ args_str })`, args);
		if(rowsAffected <= 0) throw new Error("ERROR: Unable to insert album!",album);
		album.id = lastInsertId;
		emit('db', { table: "albums", key: "insert", value: album });
		return rowsAffected;
	}
	//update
	async update(album){
		const args = [album.id, album.title, album.src, album.artwork_url, album.artwork_path]
		const args_str = args.map(function(item,index){
			return item? "$"+(index+1): 'null';
		}).join(",");
		const {rowsAffected, lastInsertId} = await db.execute(`REPLACE INTO albums (id, title, src, artwork_url, artwork_path) VALUES (${ args_str })`, args);
		if(rowsAffected <= 0) throw new Error("ERROR: Unable to update album!",album);
		album.id = lastInsertId;
		emit('db', { table: "albums", key: "update", value: album });
		return rowsAffected;
	}
	//remove
	async remove(album){
		const {rowsAffected, lastInsertId} = await db.execute("DELETE FROM albums WHERE id = $1",[album.id]);
		if(rowsAffected <= 0) throw new Error("ERROR: Unable to remove album!",album);
		emit('db', { table: "albums", key: "remove", value: album });
		return rowsAffected;
	}
}
const track_table = new TrackTable();
const album_table = new AlbumTable();

await listen('db', function({event,payload}){
    if(event !== "db") return;
    const {table, key, value} = payload;
    switch(table){
		case "tracks":
			track_table.publish(key, {track:value});
			break;
		case "albums":
			album_table.publish(key, {album:value});
			break;
	}
});

export {db, track_table, album_table};