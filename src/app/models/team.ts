import { Player } from "./players";

// export class Team
// {
//     constructor(public id:string,public name:string,public players:Player[])
//     {}
// }
export interface Team {
    name: string,
    bat_bowl_first?: string, //bat/bowl
    currentStatus?: string, //bat/bowl
    players: Player[]
}