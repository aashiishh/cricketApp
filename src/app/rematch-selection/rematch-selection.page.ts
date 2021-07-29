import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { BatBowlSelectionComponent } from '../bat-bowl-selection/bat-bowl-selection.component';
import { Ball } from '../models/ball';
import { Match } from '../models/match';
import { Overs } from '../models/overs';
import { TeamOvers } from '../models/teamOvers';

@Component({
  selector: 'app-rematch-selection',
  templateUrl: './rematch-selection.page.html',
  styleUrls: ['./rematch-selection.page.scss'],
})
export class RematchSelectionPage implements OnInit,OnDestroy {
  loadedMatches : Match[] = [];
  isLoading : boolean = false;
  private matchSub : Subscription;
  currentMatch: Match = {
    id: '',
    teams: undefined,
    scoreboard: undefined,
    teamOvers: undefined,
    matchStatus: undefined
  }
  data : boolean = true;
  constructor(private apiService:ApiServiceService,private modalCtrl: ModalController,private loadingCtrl:LoadingController,private toastCtrl:ToastController,private router:Router) { }

  ngOnInit() {
    
    this.matchSub = this.apiService.todaysMatches.subscribe(matches => {
      this.loadedMatches = matches;
      this.currentMatch = this.loadedMatches[this.loadedMatches.length - 1]; 
        })
        this.rematch();
  }
  ionViewWillEnter()
  {
    this.data = false;
      this.apiService.fetchTodaysMatchesList().subscribe(matches => {
      });
  }

  rematch()
  {
    this.loadingCtrl.create({
      message: 'creating new match, please wait...'
    }).then(loader => {
      loader.present();
      let matchNumber = (this.loadedMatches.length)+1;
      let l_id = 'Match'+matchNumber;
      let l_teams = this.currentMatch.teams;
      l_teams.teamA.players.forEach(player =>{
        player.ballsPlayed = 0;
        player.isWicket = undefined;
        player.onPitch = false;
        player.wicketsTaken = 0;
        player.runsGiven = 0;
        player.runs = 0;
      })
      l_teams.teamB.players.forEach(player =>{
        player.ballsPlayed = 0;
        player.isWicket = undefined;
        player.onPitch = false;
        player.wicketsTaken = 0;
        player.runsGiven = 0;
        player.runs = 0;
      })
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
      this.apiService.onMatchCreated(match).subscribe(result => {
        if(result){
         console.log("Match Created");
         loader.dismiss();
         setTimeout(()=> {
          this.data = true;
        },3500)
        }
         else
         console.log('Error occured while creating match');
      })
         loader.onDidDismiss().then(() => {
            this.toastCtrl.create({
              message: 'Creating new Match, please wait...',
              color: 'dark',
              position: 'middle',
              duration: 1500
            }).then(toast => {
              toast.present();
              toast.onDidDismiss().then(()=> {
                this.modalCtrl.create({
                  component: BatBowlSelectionComponent,
                  componentProps: {match : match}  // 2nd match is the match defined in line 124
                }).then(modal => {
                  modal.present();
                  return modal.onDidDismiss();
                }).then(() => {
                  this.router.navigateByUrl('/scoreboard');
                });
              })
            })
        })
   })
  }

  ngOnDestroy()
  {
    if(this.matchSub)
    this.matchSub.unsubscribe();
  }
}
