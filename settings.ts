import "dotenv/config"

const boxtoboxToken = process.env.BOX2BOX_TOKEN;
if(!boxtoboxToken){
    throw new Error('BOXTOBOX_TOKEN is not set');
}

export const settings = {
    tmMatchesFile: 'tm-matches.json',
    sofaMatchesFile: 'sofa-matches.json',
    mappedTeamsFile: 'mapped-teams-teams.json',

    teamsConfidenceLevel: 5, // how many matches are needed to be considered a mapping

    boxtoboxToken,
}



export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms)); 
}

/** stringifies a giant array
 * without out of memory arrror 
 * aka lenght is bad value
 */
export function stringifyBigArray(arr: any[]) {
    return "[" + arr.map(el => JSON.stringify(el)).join(",") + "]";
}