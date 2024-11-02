import { readFileSync, writeFileSync } from "fs"
import { settings } from "./settings"
import { chain, intersection, intersectionWith, min, uniqBy } from "lodash"
import { SingleBar } from "cli-progress"
import { differenceInCalendarDays, differenceInDays } from "date-fns"
import { BoxToBoxApi } from "./src/boxtobox"

type Match = {
    id: number,
    date: string,
    result: string,
    home: { id: string, name: string },
    away: { id: string, name: string }
}

let successes = 0
let fails = 0
const progressBar = new SingleBar({ format: ' {bar} | ETA {eta}s | found mapping:{successes} not found:{fails} | items: {value}/{total}', })

const minMatches = 5

const boxtobox = new BoxToBoxApi({ token: settings.boxtoboxToken })
async function main() {
    const tmMatches: Match[] = JSON.parse(readFileSync(settings.tmMatchesFile).toString())
    const sofaMatches: Match[] = uniqBy(JSON.parse(readFileSync(settings.sofaMatchesFile).toString()), m => m.id)

    const tmTeams = reduceTeams(tmMatches)
    const sofaTeams = reduceTeams(sofaMatches)

    // getting team mapping
    const tmTeamsMini = tmTeams.map(team => ({
        provider: 'tm' as const,
        id: team.teamId,
    }))
    const mappedTeams = await boxtobox.teamMapping(tmTeamsMini, "sofascore")
    const mappedTransfermarktIds = mappedTeams.map(team => team.tm)
    const mappedSofascoreIds = mappedTeams.map(team => team.sofascore)


    // removing unmapped
    const preparedTransfermarker = tmTeams
        .filter(t => !mappedTransfermarktIds.find(mappedId => mappedId === Number(t.teamId)))
        .filter(t => t.matches.length >= minMatches) // remove teams with too less matches for speed-up
    const preparedSofascoreTeams = sofaTeams
        .filter(t => !mappedSofascoreIds.find(mappedId => mappedId === Number(t.teamId)))
        .filter(t => t.matches.length >= minMatches) // remove teams with too less matches for speed-up

    const errs:any[] = []
    progressBar.start(preparedTransfermarker.length, 0, { successes, fails })
    const res = chain(preparedTransfermarker.slice(8,9))
        .map(tm => {
            const candidate = chain(preparedSofascoreTeams)
                // .filter(sofa => (sofa.matches.length / tm.matches.length) > 0.5) // exclude teams with too big defference
                // .filter(sofa => (sofa.matches.length / tm.matches.length) < 2)   // in matches count for speed-up
                .map(sofa => ({
                    team: {
                        teamId: sofa.teamId,
                        teamName: sofa.teamName
                    },
                    intersection: intersectMatches(tm.matches, sofa.matches),
                }))
                .sortBy(m => m.intersection.successCount - m.intersection.failsCount) // TODO: add a better metric involving fails count too
                .reverse()
                .first()//  TODO: count not just successes but faults too
                .value()
            progressBar.increment()
            if (candidate.intersection.successCount < 3
                || (candidate.intersection.successCount / candidate.intersection.failsCount) < 3) { // not more that 3 matches difference
                // also track the miss ratio
                // when 50 here and 50 on sofa, shoult not be 49 misses
                // like min arr len / missed count > 0.5
                    fails++
                progressBar.update({ fails })
                errs.push({
                    tm: {
                        teamId: tm.teamId,
                        teamName: tm.teamName,
                    },
                    sofa: candidate.team,
                    successCount: candidate.intersection.successCount,
                    missCount: candidate.intersection.missCount,
                    fails: candidate.intersection.failsCount,
                    matches: candidate.intersection.matches
                })
                return null
            }
            successes++
            progressBar.update({ successes })
            return {
                tm: {
                    teamId: tm.teamId,
                    teamName: tm.teamName,
                },
                sofa: candidate.team,
                successCount: candidate.intersection.successCount,
                missCount: candidate.intersection.missCount,
                fails: candidate.intersection.failsCount,
                matches: candidate.intersection.matches
            }

        })
        .compact()
        .sortBy(m => -m.successCount)
        .value()
    progressBar.stop()


    writeFileSync(settings.mappedTeamsFile, JSON.stringify(res, null, 4))
    writeFileSync("errs.json", JSON.stringify(errs, null, 4))

}

function reduceTeams(matches: Match[]) {
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
                    isHome: false,
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
        .map((v, k) => v)
        .value()
}

type ShortMatch = {
    date: Date,
    result: string,
    isHome: boolean,
}
function intersectMatches(arr1: ShortMatch[], arr2: ShortMatch[]) {
    // check if matcher a closer than 2 days

    // !!! `intersectionWith` is good
    // but very-very slow, because of
    // comparint every element to every
    //
    // const isect = intersectionWith(arr1,arr2,(m1,m2) => m1.result === m1.result && m2.isHome === m2.isHome && Math.abs(differenceInDays(m1.date,m2.date)) < 2)

    // ---- fast edition-----
    //
    // const matches = chain(arr1)
    //     .map(m1 => {
    //         const found = arr2.find(m2 => m1.result === m2.result && m1.isHome === m2.isHome && Math.abs(differenceInDays(m1.date, m2.date)) < 2)
    //         if (!found) {
    //             return null
    //         }
    //         return {
    //             match1: m1,
    //             match2: found
    //         }
    //     })
    //     .compact()
    //     .value()

    const matches = chain(arr1)
        .map(m1 => {
            const found = arr2.find(m2 => Math.abs(differenceInDays(m1.date, m2.date)) < 2)
            // handle tm specific value
            if (!found || found.result === "-:-" || m1.result === "-:-") {
                return {
                    type: "miss" as const
                }
            }
            const m1Result = m1.result.slice(0,4) // may contain "0:1 AET" and other values
            const foundResult = found.result.slice(0,4)
            const success =  m1Result === foundResult && m1.isHome === found.isHome
            return {
                type: success? "match" as const : "error" as const,
                match1: m1,
                match2: found
            }
        })
        .compact()
        .value()


    return {
        failsCount:matches.filter(m => m.type === "error").length,
        successCount: matches.filter(m => m.type === "match").length,
        missCount: matches.filter(m => m.type === "miss").length,
        matches: matches,
    }
}


main()