import { Plugin, Poru, ResolveOptions, Track } from "poru";
import { SpotifyManager } from "./spotifyManager";
export interface SpotifyOptions {
    clientID?: string;
    clientSecret?: string;
    clients?: {
        clientID: string;
        clientSecret: string;
    }[];
    playlistLimit?: number;
    albumLimit?: number;
    searchLimit?: number;
    searchMarket?: string;
}
export interface SpotifyAccessTokenAPIResult {
    access_token?: string;
    expires_in: number;
}
export type loadType = "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "NO_MATCHES" | "LOAD_FAILED";
export interface SpotifyFollower {
    href: string;
    total: number;
}
export interface SpotifyImage {
    url: string;
    height: number;
    width: number;
}
export interface SpotifyUser {
    display_name: string | null;
    external_urls: {
        spotify: string;
    };
    followers: SpotifyFollower;
    href: string;
    id: string;
    images: SpotifyImage[];
    type: "user";
    uri: string;
}
export interface SpotifySearchTrack {
    href: string;
    items: object[];
    limit: number;
    next: string;
    offset: string;
    previous: string;
    total: number;
}
export interface SpotifyTrack {
    album: spotifyAlbum & {
        album_group?: string;
        artists: Omit<SpotifyArtist, "followers" | "images" | "genres" | "popularity">;
    };
    artists: SpotifyArtist[];
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: {
        isrc: string;
        ean: string;
        upc: string;
    };
    external_urls: {
        spotify: string;
    };
    href: string;
    id: string;
    is_playable: boolean;
    /**
     * @description not adding types cause it's a big object
     */
    linked_from: object;
    restrictions: {
        reason: string;
    };
    name: string;
    popularity: number;
    preview_url: string;
    track_number: number;
    type: "track";
    uri: string;
    is_local: boolean;
}
export interface SpotifyArtist extends Omit<SpotifyUser, "display_name" | "type"> {
    name: string;
    genres: string[];
    popularity: number;
    type: "artist";
    uri: string;
}
export interface SpotifyPlaylist {
    collaborative: boolean;
    description: string | null;
    external_urls: {
        spotify: string;
    };
    followers: SpotifyFollower;
    href: string;
    id: string;
    images: SpotifyImage[];
    name: string;
    owner: {
        external_urls: {
            spotify: string;
        };
        followers: SpotifyFollower;
        href: string;
        id: string;
        type: "user";
        uri: string;
        display_name: string;
    };
    public: boolean;
    snapshot_id: string;
    tracks?: SpotifySearchTrack;
    type: "playlist";
    uri: string;
}
export interface spotifyAlbum {
    album_type: string;
    total_tracks: number;
    available_markets: string[];
    external_urls: {
        spotify: string;
    };
    href: string;
    id: string;
    images: SpotifyImage[];
    name: string;
    release_date: string;
    release_date_precision: string;
    restrictions?: {
        reason: string;
    };
    type: "album";
    uri: string;
    artists: SpotifyArtist[];
    tracks: SpotifySearchTrack;
}
export interface SpotifyRegularError {
    status: number;
    message: string;
}
export declare class Spotify extends Plugin {
    private baseURL;
    private authorization;
    private token;
    private interval;
    poru: Poru;
    options: SpotifyOptions;
    private _resolve;
    spotifyManager: SpotifyManager;
    constructor(options: SpotifyOptions);
    check(url: string): boolean;
    load(poru: Poru): Promise<void>;
    requestToken(): Promise<void>;
    renew(): Promise<void>;
    requestData(endpoint: string): Promise<unknown>;
    resolve({ query, source, requester }: ResolveOptions): any;
    decodeSpotifyShortLink({ query, source, requester }: ResolveOptions): any;
    fetchPlaylist(id: string, requester: any): Promise<{
        loadType: loadType;
        tracks: any;
        playlistInfo: {
            name: string;
        } | {
            name?: undefined;
        };
    } & ({
        exception: {
            message: string;
            severity: string;
        };
    } | {
        exception?: undefined;
    })>;
    fetchAlbum(id: string, requester: any): Promise<{
        loadType: loadType;
        tracks: any;
        playlistInfo: {
            name: string;
        } | {
            name?: undefined;
        };
    } & ({
        exception: {
            message: string;
            severity: string;
        };
    } | {
        exception?: undefined;
    })>;
    fetchArtist(id: string, requester: any): Promise<{
        loadType: loadType;
        tracks: any;
        playlistInfo: {
            name: string;
        } | {
            name?: undefined;
        };
    } & ({
        exception: {
            message: string;
            severity: string;
        };
    } | {
        exception?: undefined;
    })>;
    fetchTrack(id: string, requester: any): Promise<{
        loadType: loadType;
        tracks: any;
        playlistInfo: {
            name: string;
        } | {
            name?: undefined;
        };
    } & ({
        exception: {
            message: string;
            severity: string;
        };
    } | {
        exception?: undefined;
    })>;
    fetch(query: string, requester: any): any;
    fetchPlaylistTracks(spotifyPlaylist: SpotifyPlaylist): Promise<void>;
    buildUnresolved(track: any, requester: any): Promise<Track>;
    compareValue(value: boolean): boolean;
    buildResponse(loadType: loadType, tracks: any, playlistName?: string, exceptionMsg?: string): {
        loadType: loadType;
        tracks: any;
        playlistInfo: {
            name: string;
        } | {
            name?: undefined;
        };
    } & ({
        exception: {
            message: string;
            severity: string;
        };
    } | {
        exception?: undefined;
    });
}
