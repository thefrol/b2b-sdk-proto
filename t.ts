import { BoxToBoxApi } from "./src/boxtobox";

async function main(){
    const s = new BoxToBoxApi()
    const t = {
        provider: "tm" as const,
        id: 6
    }
    const m= await s.teamMapping([t],"sofascore")
    console.log(m)
}

main()