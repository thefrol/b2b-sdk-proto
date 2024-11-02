import { settings } from "./settings";
import { Table, TableParams } from "./src/airtable/airtable";

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
}
async function main(){
    const airtable = new Table<FmTeamsRecord>(params)
    const res = await airtable.all()
    await res[0].updateFields({"Transfermarkt Probable":"123"})
}

main()
