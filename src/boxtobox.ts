import PromisePool from "@supercharge/promise-pool"
import axios, { AxiosResponse } from "axios"
import { chain, chunk, entries, values } from "lodash"

type BoxToBoxAuth ={
    token: string
    url?: string
}


type providers = "tm" | "sofascore"
type ProvideredTeam ={
    provider: providers
    id: number
}

export interface MappingResponse {
    request:   Request;
    matches:   Matches;
    not_found: any[];
}

export type Matches =Record<string, Match>

export interface Match {
    name:      string;
    league:    string;
    tm:        number;
    sofascore: number;
}

export interface Request {
    from: string;
    to:   string[];
}

export class BoxToBoxApi {
    url:string = ""
    token:string
    constructor(opts: BoxToBoxAuth) {
        this.url = opts?.url || this.url
        this.token = opts?.token
    }
    async teamMapping(teams: ProvideredTeam[], to: providers){

        const {results,errors} = await PromisePool
            .for(chunk(teams,100))
            .withConcurrency(3)
            .process(async chunk => await axios.get(`https://api.analyticsfc.co.uk/api/v1/mapping/teams?from=tm&to=sofascore&ids=${chunk.map(t => t.id)}&token=${this.token}`) as AxiosResponse<MappingResponse>)
        
        return chain(results)
            .map(r => r.data)
            .map(r => values(r.matches))
            .flatten()
            .value()
    }
}