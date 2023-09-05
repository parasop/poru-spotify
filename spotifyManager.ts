import { RestManager } from "./RestManager";
import { SpotifyOptions } from "./Spotify";
const errorMessage:string = "Poru Spotify] your all spotify clientID are ratelimited try to add more clientID due to you have high usage"
export class SpotifyManager {
   private readonly mode: 'single' | 'multiple' = 'single';
   private manager : RestManager[];

   constructor(data:SpotifyOptions){
        this.manager =[]
       if(data.clients.length){
       for (const client of data.clients) this.manager?.push(new RestManager(client));
           this.mode = 'multiple';
       } else {
           this.manager.push(new RestManager({ clientID: data.clientID, clientSecret: data.clientSecret }));
         }

   }

   send<T>(endpoint: string):Promise<T>{

       if(this.mode ==="single") return this.manager[0].request(endpoint);

       const manager = this.getLeastUsedRequest() as RestManager | undefined;
       if(!manager) throw new Error(errorMessage)

       return manager.request(endpoint);
   }

   getData<T>(endpoint: string):Promise<T>{

    if(this.mode ==="single") return this.manager[0].request(endpoint);

    const manager = this.getLeastUsedRequest() as RestManager | undefined;
    if(!manager) throw new Error(errorMessage)

    return manager.getData(endpoint);
}


   protected getLeastUsedRequest(): RestManager | undefined {
       const manager = this.manager.filter((request) => !request.stats.isRateLimited);
       if (!manager.length) return undefined;
   
       return manager.sort((a, b) => a.stats.requests - b.stats.requests)[0];
     }

}
