import PromisePool from "@supercharge/promise-pool";
import { settings } from "../../settings";
import { Table, TableParams } from "../../src/airtable/airtable";
import { MultiProgressBars } from "multi-progress-bars";
import { buildTmTeamUrl, TmLambda } from "../../src/tm";

const params: TableParams={
    apiKey: settings.airtableKey || "",
    base: "appkNX9gEED5Mhobc",
    table: "FM Teams",
}


type FmTeamsRecord = {
    "Name": string,
    "ID": string, 
    "Transfermarkt": string,
    "Transfermarkt Probable":string,
    "Country": string, 
    "League": string,
    "Probable League": string | undefined, 
    "Probable Name": string | undefined, 
    "Probable Country": string |undefined,
}

const mpb = new MultiProgressBars({
    initMessage: ' $ Mapping FM Teams ',
    anchor: 'top',
    persist: true,
    
    border: true,
});


async function main(){
    const airtable = new Table<FmTeamsRecord>(params)
    const tm = new TmLambda()

    /** Step 1. Downloading data from Airtable */
    const downloadTask = "Query Airtable"
    mpb.addTask(downloadTask, {type: "indefinite", message: "Quering Airtable"})
    const res = await airtable.all()
    mpb.done(downloadTask,{message: `Received ${res.length} records`})

    const unmapped = res.filter(r => !r.fields.Transfermarkt)

    const findTask = "Find FM Teams"
    const all = unmapped.length
    let notFoundCount =0
    mpb.addTask(findTask, {type: "percentage", message: "Quering Airtable"})
    await PromisePool
        .for(unmapped)
        .withConcurrency(3)
        .onTaskFinished((t,i) =>{
            mpb.updateTask(findTask, {percentage: i.processedPercentage()/100, message: `${i.processedCount()}/${all} not found: ${notFoundCount}`})
        })
        .process(async (record,i) => {
            const name = record.fields.Name!
            const country = record.fields.Country!
            const competition = record.fields["League"]

            const found = await tm.search(name)
            const foundTeams = found.teams
            if(!foundTeams){
                notFoundCount++
                return
            }

            const countriesMatch = foundTeams.find(t => t.countryName === country)
            const mostConfidentByTm = foundTeams[0]
            const match = countriesMatch || mostConfidentByTm
            if(countriesMatch){
                notFoundCount++
                return
            }
            const teamUrl = buildTmTeamUrl(match)

            const update: Partial<FmTeamsRecord> = {
                "Transfermarkt Probable":teamUrl,
                "Probable League": match.competitionName || undefined,
                "Probable Name": match.name,
                "Probable Country": match.countryName ||  undefined
            }
            await record.updateFields(update)

            // TODO: also put probable name, probable country and others
        })

    mpb.done(findTask)
    
    mpb.cleanup()
}



main()
