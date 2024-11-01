import { cacheExchange, Client, fetchExchange } from "@urql/core";
import { retryExchange, RetryExchangeOptions } from "@urql/exchange-retry";
import { VariablesOf } from "gql.tada";
import {compact, chain, isEmpty} from 'lodash'
import { sofascore} from "./providers";



export class SofascoreLambda {
    client: Client
    constructor(url: string = "http://sofascore-lambda.azurewebsites.net/api/graphql") {
      const retryOptions : RetryExchangeOptions={
        randomDelay:true,
        initialDelayMs: 1000,
        maxDelayMs: 150000,
        maxNumberAttempts:5,
        retryIf: ()=> true // always
    }
      this.client = new Client({
        url: url,
        exchanges: compact([
          cacheExchange,
          retryExchange(retryOptions),
          fetchExchange]),
      });
    }
  
    async matchesByDate(date:string) {
        const matchesByDate = sofascore(`#graphql
            query MatchesByDate($date: String!) {
                getMatchesByDateCompat(date: $date) {
                    id
                    date
                    dateISO
                    time
                    competition{
                        id
                        name
                    }
                    result
        
                    away {
                        id
                        name
                    }
                    home {
                        id
                        name
                    }
                }
            }
        `)

        const params: VariablesOf<typeof matchesByDate> = {
            date
        }

      const { data, error } = await this.client.query(matchesByDate, params).toPromise()
      if (error) {
        throw new Error(`sofa matches request failed: ${error?.toString()}`)
      }
      if (!data) {
        throw new Error(`not matches received`)
      }
  
      return data.getMatchesByDateCompat
    }
  

}