import { cacheExchange, Client, fetchExchange } from "@urql/core";
import { retryExchange, RetryExchangeOptions } from "@urql/exchange-retry";
import { VariablesOf } from "gql.tada";
import { compact, chain, isEmpty } from 'lodash'
import { tm } from "./providers";
import { slugify } from "transliteration";

export class TmLambda {
  client: Client
  constructor(url: string = "http://tm-lambda.azurewebsites.net/api/graphql") {
    const retryOptions: RetryExchangeOptions = {
      randomDelay: true,
      initialDelayMs: 1000,
      maxDelayMs: 150000,
      maxNumberAttempts: 5,
      retryIf: () => true // always
    }
    this.client = new Client({
      url: url,
      exchanges: compact([
        cacheExchange,
        retryExchange(retryOptions),
        fetchExchange]),
    });
  }

  async matchesByDate(date: string) {
    const matchesByDate = tm(`#graphql
            query MatchesByDate($date: String!) {
                getMatchesByDate(date: $date) {
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
      throw new Error(`tm matches request failed: ${error?.toString()}`)
    }
    if (!data) {
      throw new Error(`not matches received`)
    }

    return data.getMatchesByDate
  }

  async search(text: string) {
    const searchQuery = tm(`#graphql
      query Search($text: String!) {
        search(name: $text){
          teams{
            id
            name
            countryName
            competitionName
            competitionId
          }
        }
      }
      `)

    const variables: VariablesOf<typeof searchQuery> = {
        text
    }

    const { data, error } = await this.client.query(searchQuery, variables).toPromise()
    if(error){
      throw new Error(`tm search request failed: ${error?.toString()}`)
    }
    if(!data?.search){
      throw new Error(`not matches received`)
    }

    return data.search
    }

}

export type TmTeam={
  id: string | number,
  name: string
}

export function buildTmTeamUrl(tm: TmTeam) {
  const slug = slugify(tm.name)
    .replace(/\./g, "") // TODO: also remove punctuation !!!
  return `https://www.transfermarkt.com/${slug}/startseite/verein/${tm.id}`
}