import { format, subDays } from "date-fns"
import { TmLambda } from "./src/tm"
import { chain, isEmpty, range, uniqBy } from "lodash"
import PromisePool from "@supercharge/promise-pool"
import { SofascoreLambda } from "./src/sofascore"
import { writeFileSync } from "fs"
import { settings, sleep, stringifyBigArray } from "./settings"
import { MultiBar, Presets } from "cli-progress"

const tm = new TmLambda()
const sofa = new SofascoreLambda()

const endDate = '2024-08-01'
const daysCount = 300

async function main() {

    const dates = chain(range(0, daysCount))
        .map(i => subDays(endDate, i))
        .map(d => format(d, 'yyyy-MM-dd'))
        .shuffle()
        .value()


    // create new container
    const multibar = new MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: ' {bar} | {filename} | {value}/{total}',
    }, Presets.shades_grey);

    // add bars
    const tmProgress = multibar.create(dates.length, 0);
    const sofaProgress = multibar.create(dates.length, 0);


    const tmJob = PromisePool
        .for(dates)
        .withConcurrency(3)
        .process(async (date) => {
            tmProgress.increment()
            return await tm.matchesByDate(date)
        })

    const sofaJob = PromisePool
        .for(dates)
        .withConcurrency(3)
        .process(async (date) => {
            await sleep(3000)
            sofaProgress.increment()
            return await sofa.matchesByDate(date)
        })

    const [tmMatches, sofaMatches] = await Promise.all([tmJob, sofaJob])
    
    // stop all bars
    multibar.stop();

    if (!isEmpty(tmMatches.errors) || !isEmpty(sofaMatches.errors)) {
        console.log("errors on download")
    }


    const tmString = stringifyBigArray(tmMatches.results.flat())
    writeFileSync(settings.tmMatchesFile, tmString)

    const uniqMatches = uniqBy(sofaMatches.results.flat(), m=> m.id)
    const sofaString = stringifyBigArray(uniqMatches)
    writeFileSync(settings.sofaMatchesFile, sofaString)
}

main()