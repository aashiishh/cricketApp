export class Player
{
    constructor(public id:string,public name:string, public description?:string,public imgUrl?:string,public isSelected?:boolean,public onPitch?:boolean,public isWicket?:boolean,public ballsPlayed? : number,public wicketsTaken?: number,public runs?:number,public runsGiven?:number)
    {}
    
}