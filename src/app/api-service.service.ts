import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap,take, switchMap, map} from 'rxjs/operators';
import { BehaviorSubject, forkJoin, throwError } from 'rxjs';
import { Player } from './models/players';
import { formatDate } from '@angular/common';
import { Teams } from './models/teams';
import { Scoreboard } from './models/scoreboard';
import { Team } from './models/team';
import { Match } from './models/match';
import { Overs } from './models/overs';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';

interface PlayerData{
  name:string,
  description:string
  imgUrl : string
  userId?: string
}

interface MatchData{
  createdBy?: string,
  createdByName?: string,
  createdAt?: string,
  updatedAt?: string,
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

interface MatchesByDateData {
  [date: string]: {
    Matches?: {[key: string]: MatchData}
  }
}

@Injectable({
  providedIn: 'root'
})

export class ApiServiceService {
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
 private _players = new BehaviorSubject<Player[]>([]);
 private _todaysMatches = new BehaviorSubject<Match[]>([]);

  constructor(private http:HttpClient, private authService: AuthService) { }

  private get cricketDbUrl() {
    return environment.firebase.databaseUrl + '/Cricket';
  }

  private get authQuery() {
    return this.authService.token ? '?auth=' + this.authService.token : '';
  }

  private getTodayKey() {
    return formatDate(new Date(), 'yyyyMMdd', 'en-US');
  }

  private getLegacyTodayKey() {
    return formatDate(new Date(), 'ddMMyyyy', 'en-US');
  }

  private getMatchLocation(matchId: string) {
    const match = String(matchId ?? '').match(/^(\d{8})_(.+)$/);
    if (match) {
      return {
        dateKey: match[1],
        dbMatchId: match[2]
      };
    }

    return {
      dateKey: this.getTodayKey(),
      dbMatchId: matchId
    };
  }

  canUpdateMatch(match: Match) {
    return this.authService.canManageMatches || (!!match?.createdBy && match.createdBy === this.authService.currentUser?.uid);
  }


  get todaysMatches()
  {
    return this._todaysMatches.asObservable();
  }

  private mapMatchesData(matchesData: {[key : string]: MatchData}, dateKey?: string) {
    const matches = [];
    for(const key in (matchesData ?? {}))
    {
      if(matchesData.hasOwnProperty(key))
      {
        let match : Match = {
          id : dateKey ? dateKey+'_'+key : key,
          createdBy : matchesData[key].createdBy,
          createdByName : matchesData[key].createdByName,
          createdAt : matchesData[key].createdAt,
          updatedAt : matchesData[key].updatedAt,
          teams : matchesData[key].teams,
          scoreboard : matchesData[key].scoreboard,
          teamOvers : matchesData[key].teamOvers,
          matchStatus : matchesData[key].matchStatus
        }
        matches.push(match);
      }
    }
    return matches;
  }
  get players()
  {
    return this._players.asObservable();
  }

  addNewPlayerToPlayersList(newPlayer : Player)
  {
    if (!this.canManagePlayer(newPlayer)) {
      return throwError(() => new Error('You can create only your own player profile.'));
    }

    let generatedId : string;
   return this.http.post<{name : string}>(this.cricketDbUrl + '/Players.json' + this.authQuery,{...newPlayer,id:null})
    .pipe(switchMap(resData => {
      generatedId = resData.name;
      return this._players;
    }),take(1), tap(players => {
      newPlayer.id = generatedId;
      this._players.next(players.concat(newPlayer));
    }))
  }

  updatePlayer(updatedPlayer: Player)
  {
    if (!this.canManagePlayer(updatedPlayer)) {
      return throwError(() => new Error('You can update only your own player profile.'));
    }

    return this.http.put(this.cricketDbUrl + '/Players/'+updatedPlayer.id+'.json' + this.authQuery,{...updatedPlayer,id:null})
    .pipe(switchMap(() => {
      return this.players;
    }),take(1), tap(players => {
      const updatedPlayers = players.map(player => player.id === updatedPlayer.id ? updatedPlayer : player);
      this._players.next(updatedPlayers);
    }))
  }

  deletePlayer(playerId: string)
  {
    const existingPlayer = this._players.value.find(player => player.id === playerId);
    if (!this.authService.canManagePlayers && existingPlayer?.userId !== this.authService.currentUser?.uid) {
      return throwError(() => new Error('You can delete only your own player profile.'));
    }

    return this.http.delete(this.cricketDbUrl + '/Players/'+playerId+'.json' + this.authQuery)
    .pipe(switchMap(() => {
      return this.players;
    }),take(1), tap(players => {
      this._players.next(players.filter(player => player.id !== playerId));
    }))
  }

  fetchPlayersList()
  {
    return this.http.get<{[key : string]: PlayerData}>(this.cricketDbUrl + '/Players.json' + this.authQuery).pipe(
       map( playersData => {
        const players = [];
        for(const key in (playersData ?? {}))
        {
          if(playersData.hasOwnProperty(key))
          {
            players.push(new Player(key,playersData[key].name,playersData[key].description,playersData[key].imgUrl,false,false,false,0,0,0,0,false,playersData[key].userId))
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
    let date = this.getTodayKey();
    let legacyDate = this.getLegacyTodayKey();
    const todayRequest = this.http.get<{[key : string]: MatchData}>(this.cricketDbUrl + '/Game/'+date+'/Matches.json' + this.authQuery);
    const legacyTodayRequest = legacyDate === date
      ? todayRequest
      : this.http.get<{[key : string]: MatchData}>(this.cricketDbUrl + '/Game/'+legacyDate+'/Matches.json' + this.authQuery);

    return forkJoin({
      today: todayRequest,
      legacyToday: legacyTodayRequest
    }).pipe(
      map(({ today, legacyToday }) => {
        const todayMatches = this.mapMatchesData(today);
        const legacyMatches = legacyDate === date ? [] : this.mapMatchesData(legacyToday, legacyDate);
        return todayMatches.concat(legacyMatches);
      }), tap(mlist => {
        this._todaysMatches.next(mlist);
      })
      )
  }

  private canManagePlayer(player: Player) {
    return this.authService.canManagePlayers || (!!player?.userId && player.userId === this.authService.currentUser?.uid);
  }

  fetchAllMatchesList()
  {
    return this.http.get<MatchesByDateData>(this.cricketDbUrl + '/Game.json' + this.authQuery)
    .pipe(
      map(gamesData => {
        const matches: Match[] = [];
        for(const dateKey in (gamesData ?? {}))
        {
          if(gamesData.hasOwnProperty(dateKey))
          {
            const dateMatches = gamesData[dateKey]?.Matches ?? {};
            for(const matchKey in dateMatches)
            {
              if(dateMatches.hasOwnProperty(matchKey))
              {
                matches.push({
                  id : dateKey+'_'+matchKey,
                  createdBy : dateMatches[matchKey].createdBy,
                  createdByName : dateMatches[matchKey].createdByName,
                  createdAt : dateMatches[matchKey].createdAt,
                  updatedAt : dateMatches[matchKey].updatedAt,
                  teams : dateMatches[matchKey].teams,
                  scoreboard : dateMatches[matchKey].scoreboard,
                  teamOvers : dateMatches[matchKey].teamOvers,
                  matchStatus : dateMatches[matchKey].matchStatus
                });
              }
            }
          }
        }
        return matches;
      })
    )
  }

  onMatchCreated(match : Match)
  {
    if (!this.authService.currentUser) {
      return throwError(() => new Error('Please sign in before creating a match.'));
    }

    let date = this.getTodayKey();
    const now = new Date().toISOString();
    match.createdBy = match.createdBy || this.authService.currentUser.uid;
    match.createdByName = match.createdByName || this.authService.currentUser.displayName || this.authService.currentUser.email || 'Player';
    match.createdAt = match.createdAt || now;
    match.updatedAt = now;
    // this.match = match;
   return this.http.put<{name : string}>(this.cricketDbUrl + '/Game/'+date+'/Matches/'+match.id+'.json' + this.authQuery,{...match})
    .pipe(switchMap(resData => {
      return this.todaysMatches;
    }),
    take(1),
    tap(matches => {
      const existingIndex = matches.findIndex(existingMatch => existingMatch.id === match.id);
      if (existingIndex > -1) {
        const updatedMatches = [...matches];
        updatedMatches[existingIndex] = match;
        this._todaysMatches.next(updatedMatches);
      } else {
        this._todaysMatches.next(matches.concat(match));
      }
    }))
  }

  onUpdateBatBowlSelectionOrMatchScore(match : Match)
  {
    if (!this.canUpdateMatch(match)) {
      return throwError(() => new Error('Only the match creator or an Admin can update this match.'));
    }

    const { dateKey, dbMatchId } = this.getMatchLocation(match.id);
    match.updatedAt = new Date().toISOString();
    // this.match = match;
    let updateMatches : Match[] ;
    return this.todaysMatches.pipe(take(1),switchMap(matches => {
      const index = matches.findIndex(existingMatch => existingMatch.id === match.id);
      updateMatches = [...matches];
      if (index > -1) {
        updateMatches[index] = match;
      } else {
        updateMatches.push(match);
      }
      return this.http.put<{name : string}>(this.cricketDbUrl + '/Game/'+dateKey+'/Matches/'+dbMatchId+'.json' + this.authQuery,{...match})
    }),
    tap(() => {
      this._todaysMatches.next(updateMatches);
    }));
  }

  deleteMatch(match: Match)
  {
    if (!this.authService.canManageMatches) {
      return throwError(() => new Error('Only Admin can delete matches.'));
    }

    const { dateKey, dbMatchId } = this.getMatchLocation(match.id);
    return this.http.delete(this.cricketDbUrl + '/Game/'+dateKey+'/Matches/'+dbMatchId+'.json' + this.authQuery)
    .pipe(switchMap(() => {
      return this.todaysMatches;
    }),take(1), tap(matches => {
      this._todaysMatches.next(matches.filter(existingMatch => existingMatch.id !== match.id));
    }))
  }

  getMatch(id : string)
  {
    const { dateKey, dbMatchId } = this.getMatchLocation(id);
    return this.http.get<MatchData>(this.cricketDbUrl + '/Game/'+dateKey+'/Matches/'+dbMatchId+'.json' + this.authQuery).pipe(
      map(matchData => {
         if (!matchData) {
           throw new Error('Match not found.');
         }
         const currentMatch : Match =
         {
            id : id,
            createdBy : matchData.createdBy,
            createdByName : matchData.createdByName,
            createdAt : matchData.createdAt,
            updatedAt : matchData.updatedAt,
            teams : matchData.teams,
            scoreboard : matchData.scoreboard,
            teamOvers : matchData.teamOvers,
            matchStatus : matchData.matchStatus
         }
         return currentMatch
      })

    )
  }
}
