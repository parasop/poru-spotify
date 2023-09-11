import { fetch, Request } from "undici";
import cheerio from "cheerio";

import { Plugin, Poru, ResolveOptions, Track } from "poru";
import { SpotifyManager } from "./spotifyManager";
const spotifyPattern =
  /^(?:https:\/\/open\.spotify\.com\/(?:intl-\w+\/)?(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track|artist)(?:[/:])([A-Za-z0-9]+).*$/;
const SHORT_LINK_PATTERN = "https://spotify.link";

export interface SpotifyOptions {
  clientID?: string;
  clientSecret?: string;
  clients?: { clientID: string; clientSecret: string }[];
  playlistLimit?: number;
  albumLimit?: number;
  searchLimit?: number;
  searchMarket?: string;
}

export interface SpotifyAccessTokenAPIResult {
  access_token?: string;
  expires_in: number;
}

export type loadType =
  | "TRACK_LOADED"
  | "PLAYLIST_LOADED"
  | "SEARCH_RESULT"
  | "NO_MATCHES"
  | "LOAD_FAILED";

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
    artists: Omit<
      SpotifyArtist,
      "followers" | "images" | "genres" | "popularity"
    >;
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

export interface SpotifyArtist
  extends Omit<SpotifyUser, "display_name" | "type"> {
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

export class Spotify extends Plugin {
  private baseURL: string;
  private authorization: string;
  private token: string;
  private interval: number;
  public poru: Poru;
  public options: SpotifyOptions;
  private _resolve!: ({ query, source, requester }: ResolveOptions) => any;
  public spotifyManager: SpotifyManager;

  constructor(options: SpotifyOptions) {
    super("Spotify");
    this.baseURL = "https://api.spotify.com/v1";
    this.spotifyManager = new SpotifyManager(options);
    this.authorization = Buffer.from(
      `${options.clientID}:${options.clientSecret}`
    ).toString("base64");
    this.options = {
      playlistLimit: options.playlistLimit,
      albumLimit: options.albumLimit,
      searchMarket: options.searchMarket,
      clientID: options.clientID,
      clientSecret: options.clientSecret,
    };
    this.interval = 0;
  }

  public check(url: string): boolean {
    return spotifyPattern.test(url);
  }

  public async load(poru: Poru) {
    this.poru = poru;
    this._resolve = poru.resolve.bind(poru);
    poru.resolve = this.resolve.bind(this);
  }

  async requestToken() {
    try {
      const data = await fetch(
        "https://accounts.spotify.com/api/token?grant_type=client_credentials",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${this.authorization}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const body = (await data.json()) as SpotifyAccessTokenAPIResult;

      this.token = `Bearer ${body.access_token}`;
      this.interval = body.expires_in * 1000;
    } catch (e: any) {
      if (e.status === 400) {
        throw new Error("Spotify Plugin has been rate limited");
      }
    }
  }

  public async renew() {
    if (Date.now() >= this.interval) {
      await this.requestToken();
    }
  }

  public async requestData(endpoint: string) {
    await this.renew();

    const req = await fetch(
      `${this.baseURL}${/^\//.test(endpoint) ? endpoint : `/${endpoint}`}`,
      {
        headers: { Authorization: this.token },
      }
    );
    const data = await req.json();
    return data;
  }

  public async resolve({ query, source, requester }: ResolveOptions) {
    if (!this.token) await this.requestToken();
    if (query.startsWith(SHORT_LINK_PATTERN))
      return this.decodeSpotifyShortLink({ query, source, requester });
    if (source === "spotify" && !this.check(query))
      return this.fetch(query, requester);

    const data = spotifyPattern.exec(query) ?? [];
    const id: string = data[2];
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

  async decodeSpotifyShortLink({ query, source, requester }: ResolveOptions) {
    let res = await fetch(query, { method: "GET" });
    const text = await res.text();
    const $ = cheerio.load(text);
    const spotifyLink = $("a.secondary-action");
    const spotifyUrl = spotifyLink.attr("href");

    return this.resolve({ query: spotifyUrl, source, requester });
  }

  async fetchPlaylist(id: string, requester: any) {
    try {
      const playlist = (await this.spotifyManager.send(
        `/playlists/${id}`
      )) as SpotifyPlaylist;
      await this.fetchPlaylistTracks(playlist);

      const limitedTracks = this.options.playlistLimit
        ? playlist.tracks.items.slice(0, this.options.playlistLimit)
        : playlist.tracks.items;

      const unresolvedPlaylistTracks = await Promise.all(
        limitedTracks.map((x: any) => this.buildUnresolved(x.track, requester))
      );

      return this.buildResponse(
        "PLAYLIST_LOADED",
        unresolvedPlaylistTracks,
        playlist.name
      );
    } catch (e: any) {
      return this.buildResponse(
        e.status === 404 ? "NO_MATCHES" : "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }
  }

  async fetchAlbum(id: string, requester: any) {
    try {
      const album = (await this.spotifyManager.send(
        `/albums/${id}`
      )) as spotifyAlbum;

      const limitedTracks = this.options.albumLimit
        ? album.tracks.items.slice(0, this.options.albumLimit * 100)
        : album.tracks.items;

      const unresolvedPlaylistTracks = await Promise.all(
        limitedTracks.map((x: any) => this.buildUnresolved(x, requester))
      );
      return this.buildResponse(
        "PLAYLIST_LOADED",
        unresolvedPlaylistTracks,
        album.name
      );
    } catch (e: any) {
      return this.buildResponse(
        e.body?.error.message === "invalid id" ? "NO_MATCHES" : "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }
  }

  async fetchArtist(id: string, requester: any) {
    try {
      const artist = (await this.spotifyManager.send(
        `/artists/${id}`
      )) as SpotifyArtist;

      const data = (await this.spotifyManager.send(
        `/artists/${id}/top-tracks?market=${this.options.searchMarket ?? "US"}`
      )) as { tracks: SpotifyTrack[] };

      const unresolvedPlaylistTracks = await Promise.all(
        data.tracks.map((x: any) => this.buildUnresolved(x, requester))
      );

      return this.buildResponse(
        "PLAYLIST_LOADED",
        unresolvedPlaylistTracks,
        artist.name
      );
    } catch (e: any) {
      return this.buildResponse(
        e.body?.error.message === "invalid id" ? "NO_MATCHES" : "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }
  }

  async fetchTrack(id: string, requester: any) {
    try {
      const data = (await this.spotifyManager.send(
        `/tracks/${id}`
      )) as SpotifyTrack;
      const unresolvedTrack = await this.buildUnresolved(data, requester);

      return this.buildResponse("TRACK_LOADED", [unresolvedTrack]);
    } catch (e: any) {
      return this.buildResponse(
        e.body?.error.message === "invalid id" ? "NO_MATCHES" : "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }
  }

  async fetch(query: string, requester: any) {
    try {
      if (this.check(query))
        return this.resolve({
          query,
          source: this.poru.options.defaultPlatform,
          requester,
        });

      const data: any = await this.spotifyManager.send(
        `/search/?q="${query}"&type=artist,album,track&market=${
          this.options.searchMarket ?? "US"
        }`
      );

      const unresolvedTracks = await Promise.all(
        data.tracks.items.map((x: any) => this.buildUnresolved(x, requester))
      );
      return this.buildResponse("TRACK_LOADED", unresolvedTracks);
    } catch (e: any) {
      return this.buildResponse(
        e.body?.error.message === "invalid id" ? "NO_MATCHES" : "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }
  }

  async fetchPlaylistTracks(spotifyPlaylist: SpotifyPlaylist) {
    let nextPage = spotifyPlaylist.tracks.next;
    let pageLoaded = 1;
    while (nextPage) {
      if (!nextPage) break;
      const body: any = await this.spotifyManager.getData(nextPage);
      if (body.error) break;
      spotifyPlaylist.tracks.items.push(...body.items);

      nextPage = body.next;
      pageLoaded++;
    }
  }

  async buildUnresolved(track: any, requester: any) {
    if (!track)
      throw new ReferenceError("The Spotify track object was not provided");

    return new Track(
      {
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
      },
      requester
    );
  }

  compareValue(value: boolean) {
    return typeof value !== "undefined"
      ? value !== null
      : typeof value !== "undefined";
  }

  buildResponse(
    loadType: loadType,
    tracks: any,
    playlistName?: string,
    exceptionMsg?: string
  ) {
    return Object.assign(
      {
        loadType,
        tracks,
        playlistInfo: playlistName ? { name: playlistName } : {},
      },
      exceptionMsg
        ? { exception: { message: exceptionMsg, severity: "COMMON" } }
        : {}
    );
  }
}
