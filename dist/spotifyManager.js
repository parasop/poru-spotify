"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyManager = void 0;
const RestManager_1 = require("./RestManager");
const errorMessage = "Poru Spotify] your all spotify clientID are ratelimited try to add more clientID due to you have high usage";
class SpotifyManager {
    mode = 'single';
    manager;
    constructor(data) {
        this.manager = [];
        if (data.clients.length) {
            for (const client of data.clients)
                this.manager?.push(new RestManager_1.RestManager(client));
            this.mode = 'multiple';
        }
        else {
            this.manager.push(new RestManager_1.RestManager({ clientID: data.clientID, clientSecret: data.clientSecret }));
        }
    }
    send(endpoint) {
        if (this.mode === "single")
            return this.manager[0].request(endpoint);
        const manager = this.getLeastUsedRequest();
        if (!manager)
            throw new Error(errorMessage);
        return manager.request(endpoint);
    }
    getData(endpoint) {
        if (this.mode === "single")
            return this.manager[0].request(endpoint);
        const manager = this.getLeastUsedRequest();
        if (!manager)
            throw new Error(errorMessage);
        return manager.getData(endpoint);
    }
    getLeastUsedRequest() {
        const manager = this.manager.filter((request) => !request.stats.isRateLimited);
        if (!manager.length)
            return undefined;
        return manager.sort((a, b) => a.stats.requests - b.stats.requests)[0];
    }
}
exports.SpotifyManager = SpotifyManager;
//# sourceMappingURL=spotifyManager.js.map