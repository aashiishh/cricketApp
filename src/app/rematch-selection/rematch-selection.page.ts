import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { BatBowlSelectionComponent } from '../bat-bowl-selection/bat-bowl-selection.component';
import { Ball } from '../models/ball';
import { Match } from '../models/match';
import { Overs } from '../models/overs';
import { Player } from '../models/players';
import { TeamOvers } from '../models/teamOvers';
import { Teams } from '../models/teams';

@Component({
  selector: 'app-rematch-selection',
  templateUrl: './rematch-selection.page.html',
  styleUrls: ['./rematch-selection.page.scss'],
  standalone: false
})
export class RematchSelectionPage implements OnInit,OnDestroy {
  loadedMatches : Match[] = [];
  isLoading : boolean = false;
  private matchSub : Subscription;
  currentMatch: Match = {
    id: '',
    teams: {
      teamA: { name: '', players: [] },
      teamB: { name: '', players: [] }
    },
    scoreboard: {
      teamA: { overs: 0, runs: 0, wickets: 0 },
      teamB: { overs: 0, runs: 0, wickets: 0 }
    },
    teamOvers: { teamAOvers: undefined, teamBOvers: undefined, oversCount: 0 },
    matchStatus: { status: '', whoWon: '', wonBy: '' }
  }
  data : boolean = true;
  constructor(private apiService:ApiServiceService,private modalCtrl: ModalController,private loadingCtrl:LoadingController,private toastCtrl:ToastController,private router:Router) { }

  private resetPlayerForRematch(player: Player): Player {
    return {
      ...player,
      isSelected: false,
      ballsPlayed: 0,
      isWicket: false,
      onPitch: false,
      wicketsTaken: 0,
      runsGiven: 0,
      runs: 0,
      isStriker: false
    };
  }

  private cloneTeamsForRematch(): Teams {
    return {
      teamA: {
        ...this.currentMatch.teams.teamA,
        bat_bowl_first: '',
        currentStatus: '',
        players: this.currentMatch.teams.teamA.players.map(player => this.resetPlayerForRematch(player))
      },
      teamB: {
        ...this.currentMatch.teams.teamB,
        bat_bowl_first: '',
        currentStatus: '',
        players: this.currentMatch.teams.teamB.players.map(player => this.resetPlayerForRematch(player))
      }
    };
  }

  ngOnInit() {

    this.matchSub = this.apiService.todaysMatches.subscribe(matches => {
      this.loadedMatches = matches;
      this.currentMatch = this.loadedMatches[this.loadedMatches.length - 1];
        })
  }
  ionViewWillEnter()
  {
    this.data = false;
      this.apiService.fetchTodaysMatchesList().subscribe(matches => {
        this.loadedMatches = matches;
        this.currentMatch = this.loadedMatches[this.loadedMatches.length - 1];
        this.rematch();
      }, () => {
        this.data = true;
        this.toastCtrl.create({
          message: 'Unable to load matches for rematch.',
          color: 'danger',
          position: 'bottom',
          duration: 2500
        }).then(toast => toast.present());
      });
  }

  rematch()
  {
    if (!this.currentMatch?.teams || !this.currentMatch.teamOvers) {
      return;
    }

    this.loadingCtrl.create({
      message: 'creating new match, please wait...'
    }).then(loader => {
      loader.present();
      let matchNumber = (this.loadedMatches.length)+1;
      let l_id = 'Match'+matchNumber+'_'+Date.now();
      let l_teams = this.cloneTeamsForRematch();
      let count = this.currentMatch.teamOvers.oversCount;
      let l_teamOvers : TeamOvers= {
        teamAOvers : new Overs([],0,0),
        teamBOvers : new Overs([],0,0),
        oversCount : count
      };
      for(let i=0;i<count;i++)
      {
        let ballsA  = [];
        let ballsB  = [];
        let ballA: Ball = {
          baller: '',
          batsman: '',
          run: '',
          status: '',
        }
        let ballB: Ball = {
          baller: '',
          batsman: '',
          run: '',
          status: '',
        }
        ballsA.push(ballA);
        ballsB.push(ballB);
        let overA = {
          balls : ballsA
        }
        let overB = {
          balls : ballsB
        }
        l_teamOvers.teamAOvers.overs.push(overA);
        l_teamOvers.teamBOvers.overs.push(overB);
      }
      let l_matchStatus = {
        status : 'live',
        whoWon : '',
        wonBy : ''
      }  //before starting the match
      let l_scoreboard = {
        teamA: {
          overs: 0,
          runs: 0,
          balls : 0,
          wickets: 0
      },
      teamB: {
        overs: 0,
        runs: 0,
        balls : 0,
        wickets: 0
      },
      } //before starting the match

      let match : Match = {
        id : l_id,
        teams : l_teams,
        teamOvers : l_teamOvers,
        scoreboard : l_scoreboard,
        matchStatus : l_matchStatus
      }
      loader.dismiss();
      this.data = true;
      this.modalCtrl.create({
        component: BatBowlSelectionComponent,
        componentProps: {match : match},
        backdropDismiss: false
      }).then(modal => {
        modal.present();
        return modal.onDidDismiss();
      }).then(result => {
        if (result.role === 'confirm') {
          this.router.navigate(['/scoreboard', match.id]);
        } else {
          this.router.navigate(['/home']);
        }
      });
   })
  }

  ngOnDestroy()
  {
    if(this.matchSub)
    this.matchSub.unsubscribe();
  }
}
