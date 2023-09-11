"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spotify = void 0;
const undici_1 = require("undici");
const cheerio_1 = __importDefault(require("cheerio"));
const poru_1 = require("poru");
const spotifyManager_1 = require("./spotifyManager");
const spotifyPattern = /^(?:https:\/\/open\.spotify\.com\/(?:intl-\w+\/)?(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track|artist)(?:[/:])([A-Za-z0-9]+).*$/;
const SHORT_LINK_PATTERN = "https://spotify.link";
class Spotify extends poru_1.Plugin {
    baseURL;
    authorization;
    token;
    interval;
    poru;
    options;
    _resolve;
    spotifyManager;
    constructor(options) {
        super("Spotify");
        this.baseURL = "https://api.spotify.com/v1";
        this.spotifyManager = new spotifyManager_1.SpotifyManager(options);
        this.authorization = Buffer.from(`${options.clientID}:${options.clientSecret}`).toString("base64");
        this.options = {
            playlistLimit: options.playlistLimit,
            albumLimit: options.albumLimit,
            searchMarket: options.searchMarket,
            clientID: options.clientID,
            clientSecret: options.clientSecret,
        };
        this.interval = 0;
    }
    check(url) {
        return spotifyPattern.test(url);
    }
    async load(poru) {
        this.poru = poru;
        this._resolve = poru.resolve.bind(poru);
        poru.resolve = this.resolve.bind(this);
    }
    async requestToken() {
        try {
            const data = await (0, undici_1.fetch)("https://accounts.spotify.com/api/token?grant_type=client_credentials", {
                method: "POST",
                headers: {
                    Authorization: `Basic ${this.authorization}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
            const body = (await data.json());
            this.token = `Bearer ${body.access_token}`;
            this.interval = body.expires_in * 1000;
        }
        catch (e) {
            if (e.status === 400) {
                throw new Error("Spotify Plugin has been rate limited");
            }
        }
    }
    async renew() {
        if (Date.now() >= this.interval) {
            await this.requestToken();
        }
    }
    async requestData(endpoint) {
        await this.renew();
        const req = await (0, undici_1.fetch)(`${this.baseURL}${/^\//.test(endpoint) ? endpoint : `/${endpoint}`}`, {
            headers: { Authorization: this.token },
        });
        const data = await req.json();
        return data;
    }
    async resolve({ query, source, requester }) {
        if (!this.token)
            await this.requestToken();
        if (query.startsWith(SHORT_LINK_PATTERN))
            return this.decodeSpotifyShortLink({ query, source, requester });
        if (source === "spotify" && !this.check(query))
            return this.fetch(query, requester);
        const data = spotifyPattern.exec(query) ?? [];
        const id = data[2];
        switch (data[1]) {
            case "playlist": {
                return this.fetchPlaylist(id, requester);
            }
            case "track": {
                return this.fetchTrack(id, requester);
            }
            case "album": {
                return this.fetchAlbum(id, requester);
            }
            case "artist": {
                return this.fetchArtist(id, requester);
            }
            default: {
                return this._resolve({
                    query,
                    source: this.poru.options.defaultPlatform,
                    requester: requester,
                });
            }
        }
    }
    async decodeSpotifyShortLink({ query, source, requester }) {
        let res = await (0, undici_1.fetch)(query, { method: "GET" });
        const text = await res.text();
        const $ = cheerio_1.default.load(text);
        const spotifyLink = $("a.secondary-action");
        const spotifyUrl = spotifyLink.attr("href");
        return this.resolve({ query: spotifyUrl, source, requester });
    }
    async fetchPlaylist(id, requester) {
        try {
            const playlist = (await this.spotifyManager.send(`/playlists/${id}`));
            await this.fetchPlaylistTracks(playlist);
            const limitedTracks = this.options.playlistLimit
                ? playlist.tracks.items.slice(0, this.options.playlistLimit)
                : playlist.tracks.items;
            const unresolvedPlaylistTracks = await Promise.all(limitedTracks.map((x) => this.buildUnresolved(x.track, requester)));
            return this.buildResponse("PLAYLIST_LOADED", unresolvedPlaylistTracks, playlist.name);
        }
        catch (e) {
            return this.buildResponse(e.status === 404 ? "NO_MATCHES" : "LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async fetchAlbum(id, requester) {
        try {
            const album = (await this.spotifyManager.send(`/albums/${id}`));
            const limitedTracks = this.options.albumLimit
                ? album.tracks.items.slice(0, this.options.albumLimit * 100)
                : album.tracks.items;
            const unresolvedPlaylistTracks = await Promise.all(limitedTracks.map((x) => this.buildUnresolved(x, requester)));
            return this.buildResponse("PLAYLIST_LOADED", unresolvedPlaylistTracks, album.name);
        }
        catch (e) {
            return this.buildResponse(e.body?.error.message === "invalid id" ? "NO_MATCHES" : "LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async fetchArtist(id, requester) {
        try {
            const artist = (await this.spotifyManager.send(`/artists/${id}`));
            const data = (await this.spotifyManager.send(`/artists/${id}/top-tracks?market=${this.options.searchMarket ?? "US"}`));
            const unresolvedPlaylistTracks = await Promise.all(data.tracks.map((x) => this.buildUnresolved(x, requester)));
            return this.buildResponse("PLAYLIST_LOADED", unresolvedPlaylistTracks, artist.name);
        }
        catch (e) {
            return this.buildResponse(e.body?.error.message === "invalid id" ? "NO_MATCHES" : "LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async fetchTrack(id, requester) {
        try {
            const data = (await this.spotifyManager.send(`/tracks/${id}`));
            const unresolvedTrack = await this.buildUnresolved(data, requester);
            return this.buildResponse("TRACK_LOADED", [unresolvedTrack]);
        }
        catch (e) {
            return this.buildResponse(e.body?.error.message === "invalid id" ? "NO_MATCHES" : "LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async fetch(query, requester) {
        try {
            if (this.check(query))
                return this.resolve({
                    query,
                    source: this.poru.options.defaultPlatform,
                    requester,
                });
            const data = await this.spotifyManager.send(`/search/?q="${query}"&type=artist,album,track&market=${this.options.searchMarket ?? "US"}`);
            const unresolvedTracks = await Promise.all(data.tracks.items.map((x) => this.buildUnresolved(x, requester)));
            return this.buildResponse("TRACK_LOADED", unresolvedTracks);
        }
        catch (e) {
            return this.buildResponse(e.body?.error.message === "invalid id" ? "NO_MATCHES" : "LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async fetchPlaylistTracks(spotifyPlaylist) {
        let nextPage = spotifyPlaylist.tracks.next;
        let pageLoaded = 1;
        while (nextPage) {
            if (!nextPage)
                break;
            const body = await this.spotifyManager.getData(nextPage);
            if (body.error)
                break;
            spotifyPlaylist.tracks.items.push(...body.items);
            nextPage = body.next;
            pageLoaded++;
        }
    }
    async buildUnresolved(track, requester) {
        if (!track)
            throw new ReferenceError("The Spotify track object was not provided");
        return new poru_1.Track({
            track: "",
            info: {
                sourceName: "spotify",
                identifier: track.id,
                isSeekable: true,
                author: track.artists[0]?.name || "Unknown Artist",
                length: track.duration_ms,
                isStream: false,
                title: track.name,
                uri: `https://open.spotify.com/track/${track.id}`,
                image: track.album?.images[0]?.url,
            },
        }, requester);
    }
    compareValue(value) {
        return typeof value !== "undefined"
            ? value !== null
            : typeof value !== "undefined";
    }
    buildResponse(loadType, tracks, playlistName, exceptionMsg) {
        return Object.assign({
            loadType,
            tracks,
            playlistInfo: playlistName ? { name: playlistName } : {},
        }, exceptionMsg
            ? { exception: { message: exceptionMsg, severity: "COMMON" } }
            : {});
    }
}
exports.Spotify = Spotify;
//# sourceMappingURL=Spotify.js.map