import { Plugin, Poru, ResolveOptions, Track } from "poru";
export interface SpotifyOptions {
    clientID: string;
    clientSecret: string;
    playlistLimit?: number;
    albumLimit?: number;
    artistLimit?: number;
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
export declare class Spotify extends Plugin {
    private baseURL;
    private authorization;
    private token;
    private interval;
    poru: Poru;
    options: SpotifyOptions;
    private _search;
    constructor(options: SpotifyOptions);
    check(url: string): boolean;
    load(poru: Poru): Promise<void>;
    requestToken(): Promise<void>;
    renew(): Promise<void>;
    requestData(endpoint: string): Promise<unknown>;
    resolve({ query, source, requester }: ResolveOptions): any;
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
    fetchPlaylistTracks(spotifyPlaylist: any): Promise<void>;
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
