import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { tap,take, switchMap, map} from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { Player } from './models/players';
import { DatePipe } from '@angular/common';
import { Teams } from './models/teams';
import { Scoreboard } from './models/scoreboard';
import { Team } from './models/team';
import { Match } from './models/match';
import { Overs } from './models/overs';

interface PlayerData{
  name:string,
  description:string
} 

interface MatchData{
  name : string,
  teams : Teams,
  scoreboard : Scoreboard,
  teamOvers : {
    teamAOvers : Overs,
    teamBOvers : Overs,
    oversCount : number
  },
  matchStatus : {
    status : string,
    whoWon : string,
    wonBy : string
}
}

@Injectable({
  providedIn: 'root'
})

export class ApiServiceService {
 // private _array = new BehaviorSubject<number[]>([]);
scoreboard : Scoreboard = {
   teamA : {
     overs : 0,
     runs : 0,
     wickets : 0
   },
   teamB : {
    overs : 0,
    runs : 0,
    wickets : 0
   }
}
teams : Teams = {
  teamA : {
    name : '',
    bat_bowl_first :'',
    players : []
  },
  teamB :  {
    name : '',
    bat_bowl_first :'',
    players : []
  }
}

 array: number[];
 
 private _todaysPlayers = new BehaviorSubject<string>('');
 private _players = new BehaviorSubject<Player[]>([]);
 private _todaysTeams = new BehaviorSubject<Teams>(this.teams);
 private _todaysMatches = new BehaviorSubject<Match[]>([]);
 
  constructor(private http:HttpClient,private datepipe:DatePipe) { }

  get todaysTeams()
  {
    return this._todaysTeams.asObservable();
  }
  get todaysMatches()
  {
    return this._todaysMatches.asObservable();
  }
  get todaysPlayers()
  {
    return this._todaysPlayers.asObservable();
  }
  get players()
  {
    return this._players.asObservable();
  }

  addPlayers(names : string,count: number)
  {
    
  let date =this.datepipe.transform(new Date(), 'ddMMyyyy');
    const playersData = {
      "date":date,
      "names":names,
      "count":count
    }
    this.http.post<any>('http://13.232.50.107:8009/addplayers/',playersData).subscribe(result => {
      console.log();
    })
  }

  getTodaysPlayers()
  {
    let date =this.datepipe.transform(new Date(), 'ddMMyyyy');
    return this.http.get<any>('http://13.232.50.107:8009/getplayers/'+date).pipe(
      map(playersObj => {
        return playersObj.names;
      }),tap(names => {
        this._todaysPlayers.next(names);
      })
    )
  }

  addNewPlayerToPlayersList(newPlayer : Player)
  {
    let generatedId : string; 
   return this.http.post<{name : string}>('https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Players.json',{...newPlayer,id:null})
    .pipe(switchMap(resData => {
      console.log(resData.name)
      generatedId = resData.name;
      return this._players;
    }),take(1), tap(players => {
      newPlayer.id = generatedId;
      this._players.next(players.concat(newPlayer));
    }))
  }

  addTodaysTeams(createdTeams : Teams)
  { 
    let date =this.datepipe.transform(new Date(), 'ddMMyyyy');
    const urlStringforTeamA = ''+date+'/Teams'; 

    // let Teams = {
    //     "teamA" : {
    //        "name": createdTeams.teamA.name,
    //        "players" : createdTeams.teamA.players
    //     },
    //     "teamB" : {
    //       "name": createdTeams.teamB.name,
    //       "players" : createdTeams.team2.players
    //     }
    // }
    this.teams = createdTeams;

   return this.http.post<{name : string}>('https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Game/'+urlStringforTeamA+'.json',this.teams)
    .pipe(switchMap(resData => {
      return this._todaysTeams;
    }),take(1), tap(teams => {
      this._todaysTeams.next(teams);
    }))
  }

  fetchPlayersList()
  {
    return this.http.get<{[key : string]: PlayerData}>('https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Players.json').pipe(
       map( playersData => {
        const players = [];
        for(const key in playersData)
        {
          if(playersData.hasOwnProperty(key))
          {
            players.push(new Player(key,playersData[key].name,playersData[key].description))
          }
        }
        return players;
      }), tap(plist => {
        this._players.next(plist);
      })
      )
  }


  fetchTodaysMatchesList()
  {
    let date =this.datepipe.transform(new Date(), 'ddMMyyyy');
    const urlString = '/'+date+'/Matches';
    return this.http.get<{[key : string]: MatchData}>('https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Game'+urlString+'.json').pipe(
       map( matchesData => {
        const matches = [];
        for(const key in matchesData)
        {
          if(matchesData.hasOwnProperty(key))
          {
            let match : Match = {
              id : key,
              teams : matchesData[key].teams,
              scoreboard : matchesData[key].scoreboard,
              teamOvers : matchesData[key].teamOvers,
              matchStatus : matchesData[key].matchStatus
            }
            matches.push(match);
          }
        }
        return matches;
      }), tap(mlist => {
        this._todaysMatches.next(mlist);
      })
      )
  }

  onMatchCreated(match : Match)
  {
    let date =this.datepipe.transform(new Date(), 'ddMMyyyy'); 
    // this.match = match;
   return this.http.put<{name : string}>('https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Game/'+date+'/Matches/'+match.id+'.json',match)
    .pipe(switchMap(resData => {
      return this._todaysMatches;
    }),take(1), tap(matches => {
      this._todaysMatches.next(matches.concat(match));
    }))
  }

  onUpdateBatBowlSelectionOrMatchScore(match : Match)
  {
    let date =this.datepipe.transform(new Date(), 'ddMMyyyy'); 
    // this.match = match;
   return this.http.put<{name : string}>('https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Game/'+date+'/Matches/'+match.id+'.json',match)
    .pipe(switchMap(resData => {
      return this._todaysMatches;
    }),take(1), tap(matches => {
      this._todaysMatches.next(matches.concat(match));
    }))
  }

  /*get array()
  {
    return this._array.asObservable();
  }

  bubbleSort(toBeSorted : string)
{
return this.http.get('http://localhost:8010/spring-rest-demo/myapp/bubblesort/'+toBeSorted).pipe(
map( numbers => {
  console.log(numbers)
const arr = [];
for(const key in numbers)
{
  if(numbers.hasOwnProperty(key))
  {
    arr.push(numbers[key])
  }
}
return arr;
}), tap(list => {
this._array.next(list);
})
)
}*/
}
