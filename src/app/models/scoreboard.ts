export interface Scoreboard {
    teamA: {
        overs: number,
        runs: number,
        balls? : number
        wickets: number
    },
    teamB: {
        overs: number,
        runs: number,
        balls? : number
        wickets: number
    }
}