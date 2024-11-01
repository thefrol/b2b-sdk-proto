import { readFileSync, writeFileSync } from "fs"
import { settings } from "./settings"
import { chain, intersection, uniqBy } from "lodash"
import { SingleBar } from "cli-progress"
import { differenceInCalendarDays } from "date-fns"

type Match ={
    id: number,
    date: string,
    result: string,
    home:{id: number, name: string},
    away:{id: number, name: string}
}

let successes = 0
let fails =0
const progressBar = new SingleBar({format: ' {bar} | good:{successes} bad:{fails} | {value}/{total}',})

async function main(){
    const tmMatches: Match[] = JSON.parse(readFileSync(settings.tmMatchesFile).toString())
    const sofaMatches: Match[] = uniqBy(JSON.parse(readFileSync(settings.sofaMatchesFile).toString()),m => m.id)

    const tmTeams = reduceTeams(tmMatches)
    const sofaTeams = reduceTeams(sofaMatches)


    progressBar.start(tmTeams.length,0,{successes,fails})
    const res = chain(tmTeams)
        .map(tm =>{
            const candidate = chain(sofaTeams)
                .map( sofa => ({
                    team:{teamId: sofa.teamId,
                    teamName: sofa.teamName},
                    intersection: intersectMatches(tm.matches,sofa.matches),
                }))
                .sortBy(m => m.intersection.count)
                .reverse()
                .first()
                .value()
            progressBar.increment()
            if(candidate.intersection.count<3 || (candidate.intersection.count / tm.matches.length) < 0.5 ){ // not more that 3 matches difference
                fails++
                 progressBar.update({fails})
                return null
            }
            successes++
            progressBar.update({successes})
            return {
                tm,
                sofa: candidate.team,
                count: candidate.intersection.count,
            }

        })
        .compact()
        .sortBy(m => -m.count)
        .value()
    progressBar.stop()


    writeFileSync(settings.mappedTeamsFile, JSON.stringify(res,null,4))

}

function reduceTeams(matches: Match[]){
    return chain(matches)
        .map(m => {
            const home = m.home
            const away = m.away
            const result = m.result
            const date = m.date
            return [
                {
                    teamId: home.id,
                    teamName: home.name,
                    isHome: true,
                    result, date,
                },
                {
                    teamId: away.id,
                    teamName: away.name,
                    isHome:false,
                    result, date,
                }
            ]
        })
        .flatten()
        .groupBy(m => m.teamId)
        .mapValues(matches => ({
            teamId: matches[0].teamId,
            teamName: matches[0].teamName,
            matches: matches.map(m => ({
                date: new Date(m.date),
                result: m.result,
                isHome: m.isHome,
            }))
        }))
        .map((v,k)=>v)
        .value()
}

type ShortMatch ={
    date: Date,
    result: string,
    isHome: boolean,
}
function intersectMatches(arr1: ShortMatch[], arr2:ShortMatch[]){
    // check if matcher a closer than 2 days

    const matches= chain(arr1)
        .map(m1 =>{
            const found = arr2.find(m2 => differenceInCalendarDays(m1.date,m2.date) < 2 && m1.result === m2.result && m1.isHome === m2.isHome)
            if(!found){
                return null
            }
            return {
                match1: m1,
                match2: found
            }
        })
        .compact()
        .value()
        return {
            count: matches.length,
            matches
        }
}


main()