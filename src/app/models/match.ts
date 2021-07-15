import { Scoreboard } from "./scoreboard";
import { TeamOvers } from "./teamOvers";
import { Teams } from "./teams";

export interface Match {
    id: string,
    teams : Teams,   //description of teams playing the match
    scoreboard : Scoreboard, // for showing/saving current/final score for both teams
    teamOvers : TeamOvers  // for showing/saving status of each ball of each over
    matchStatus : {
        status : string, //live/end
        whoWon : string,
        wonBy : string
    }  // show saving the end result
}