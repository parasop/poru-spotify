import { RestManager } from "./RestManager";
import { SpotifyOptions } from "./Spotify";
export declare class SpotifyManager {
    private readonly mode;
    private manager;
    constructor(data: SpotifyOptions);
    send<T>(endpoint: string): Promise<T>;
    getData<T>(endpoint: string): Promise<T>;
    protected getLeastUsedRequest(): RestManager | undefined;
}
