import PromisePool from "@supercharge/promise-pool";
import axios from "axios";
import { readFileSync } from "fs";
import { chain } from "lodash";
import { slugify } from "transliteration";
import { settings } from "./settings";
import { SingleBar } from "cli-progress";


const params = {
    mappedTeamsFile: settings.mappedTeamsFile,
    apiKey: process.env["AIRTABLE_TOKEN"],
}

type AirtableRecord = {
    name: string,
    tmName: string,
    id: number,
    count: string,
    transfermarkt: string,
    transfermarktProbable: string,

}



type Team = {
    teamId: string
    teamName: string
    matches: string[],
}

type TeamMapping = {
    tm: Team,
    sofa: Team
    count: number
}

function buildTmUrl(tm: Team) {
    const slug = slugify(tm.teamName)
    return `https://www.transfermarkt.com/${slug}/startseite/verein/${tm.teamId}`
}

async function createTeamRecord(fields: any[]) {
    const headers = {
        "Authorization": `Bearer ${params.apiKey}`,
        "Content-Type": "application/json"
    }

    const requests = chain(fields)
        .map(fields => ({ fields }))
        .chunk(10)
        .value()

    const progressBar = new SingleBar({format: ' {bar} | Uploading to airtable | {value}/{total}',})
     progressBar.start(requests.length, 0)

    await PromisePool
        .withConcurrency(4)
        .for(requests)
        .process(async records => {
            const data = {
                records
            }
            const url = "https://api.airtable.com/v0/appkNX9gEED5Mhobc/Sofascore Teams"
            const resp = await axios.post(url, data, { headers, validateStatus: (status: number) => status < 500 })
            if (resp.status != 200) {
                console.error("error", resp.data)
                throw new Error(`cant add records: status code ${resp.status} ${resp.statusText}`)
            }
            progressBar.increment()
        })
}

async function main() {
    const mapping: TeamMapping[] = JSON.parse(readFileSync(params.mappedTeamsFile).toString())
    const records = chain(mapping)
        .compact()
        .map(mapping => ({
            "Name": mapping.sofa.teamName,
            "Sofascore ID": Number(mapping.sofa.teamId),
            "Probable Name": mapping.tm.teamName,
            "Transfermarkt": null,
            "Transfermarkt Probable": buildTmUrl(mapping.tm),
            "Matches Count": mapping.count
        }))
        .value()

    await createTeamRecord(records)

}

main()