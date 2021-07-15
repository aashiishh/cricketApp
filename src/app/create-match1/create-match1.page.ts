import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AddPlayerComponent } from '../add-player/add-player.component';
import { ApiServiceService } from '../api-service.service';
import { BatBowlSelectionComponent } from '../bat-bowl-selection/bat-bowl-selection.component';
import { Match } from '../models/match';
import { Overs } from '../models/overs';
import { Over } from '../models/over';
import { Ball } from '../models/ball'
import { Player } from '../models/players';
import { Team } from '../models/team';
import { Teams } from '../models/teams';

@Component({
  selector: 'app-create-match1',
  templateUrl: './create-match1.page.html',
  styleUrls: ['./create-match1.page.scss'],
})
export class CreateMatch1Page implements OnInit,OnDestroy {

  player : Player;
  isLoading : boolean = false;
  loadedPlayers : Player[] = [];
  playerstoDisplay : Player[] =[];
  loadedMatches : Match[] = [];
teamA : Team = {
  name : '',
  bat_bowl_first : '',
  players : []
}
teamB : Team = {
  name : '',
  bat_bowl_first : '',
  players : []
}
teams : Teams = {
  teamA : this.teamA,
  teamB : this.teamB
}
  playersForTeam1:Player[] = [];
  playersForTeam2:Player[] = [];
  selectedTeam: string = "";
  match : Match = {
    id: '',
    teams : this.teams,
    scoreboard : undefined,
    teamOvers : {
      teamAOvers : new Overs([],0,0),
      teamBOvers : new Overs([],0,0),
      oversCount : 0
    },
    matchStatus : undefined
  }
  private matchSub : Subscription;
  private playersSub : Subscription;
  @ViewChild('f', {static: true}) form1: NgForm;

  constructor(private apiService:ApiServiceService,private modalCtrl: ModalController,private loadingCtrl:LoadingController,private toastCtrl:ToastController,private router:Router) { }

  ngOnInit() {
    this.playersSub = this.apiService.players.subscribe(players => {
      this.loadedPlayers = players;
      this.playerstoDisplay = this.loadedPlayers;
    });
    this.matchSub = this.apiService.todaysMatches.subscribe(matches => {
      this.loadedMatches = matches;
      console.log('All Matches - ',this.loadedMatches.length) 
 })
    this.playerstoDisplay = this.loadedPlayers;
  }

  ionViewWillEnter()
  { 
    /*this.modalCtrl.create({
      component: BatBowlSelectionComponent,
      componentProps: {teams : this.teams}
    }).then(modal => {
      modal.present();
       return modal.onDidDismiss();
    }).then(() => {
      console.log("Model Closed")
      this.loadingCtrl.dismiss(); //loading started at bat-bowl-selection
      this.toastCtrl.create({
        message: 'Match Started!!',
        color: 'dark',
        position: 'middle',
        duration: 3000
      }).then(toast => {
        toast.present();
        // this.router.navigateByUrl('/scoreboard');
      })
    })*/
      this.isLoading = true;
      this.apiService.fetchPlayersList().subscribe(() => {
        this.isLoading = false;
      });
      this.apiService.fetchTodaysMatchesList().subscribe(matches => {
        console.log(matches)
        this.isLoading = false;
      });
  }

  onAddPlayer() {
    this.modalCtrl.create({
      component: AddPlayerComponent
    }).then(modal => {
      modal.present();
      return modal.onDidDismiss();
    }).then(
      resultData => {
        if(resultData.role==='confirm')
        {
          this.loadingCtrl.create({
            message: 'Adding Player...'
          }).then(loader => {
            loader.present();
            this.player = new Player(Math.random().toString(),resultData.data.newPlayerData.name,resultData.data.newPlayerData.desc);
            this.apiService.addNewPlayerToPlayersList(this.player).subscribe(() => {
              console.log(this.player,' added successfully')
              loader.dismiss();
              loader.onDidDismiss().then(() => {
                this.toastCtrl.create({
                  message: this.player.name+' added successfully!!',
                  color: 'secondary',
                  position: 'bottom',
                  duration: 2000
                }).then(toast => {
                  toast.present();
                })
            })
            })
          });
        }
      }
    )
  }

  onTeamsNameSubmitted()
  {
    if(!this.form1.valid)
    return;
    this.teamA.name = this.form1.value['name1'];
    this.teamB.name = this.form1.value['name2'];
    const oversCount = this.form1.value['oversCount'];
    for(let i=0;i<oversCount;i++)
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
      this.match.teamOvers.teamAOvers.overs.push(overA);
      this.match.teamOvers.teamBOvers.overs.push(overB);
    }
    this.match.teamOvers.oversCount = oversCount;
  }
  onPlayerDidSelected(selectedPlayer : Player)
  {
      if(selectedPlayer.isSelected && this.selectedTeam === "teamA")
      {
        this.playersForTeam1.push(selectedPlayer);
      }
      else
    {
      this.playersForTeam1 = this.playersForTeam1.filter(i => i.id !== selectedPlayer.id); //when user de-select the item
    }
      if(selectedPlayer.isSelected && this.selectedTeam === "teamB")
      {
        this.playersForTeam2.push(selectedPlayer);
      }
      else
      {
        this.playersForTeam2 = this.playersForTeam2.filter(i => i.id !== selectedPlayer.id); //when user de-select the item
      }
  }

  onCreateTeam()
  {
    //if(this.playersForTeam1.length==0 && this.playersForTeam2.length==0)
    if(this.playersForTeam1.length>0 &&  this.playersForTeam2.length==0)
    {
      this.teamA.players = this.playersForTeam1;
      this.playersForTeam1.forEach(player => {
           this.playerstoDisplay = this.playerstoDisplay.filter(i=> i.id !== player.id)
           this.selectedTeam = "";
      })
    }
    else if(this.playersForTeam2.length>0 &&  this.playersForTeam1.length==0)
    {
      this.teamB.players = this.playersForTeam2;
      this.playersForTeam2.forEach(player => {
           this.playerstoDisplay = this.playerstoDisplay.filter(i=> i.id !== player.id)
           this.selectedTeam = "";
      })
    }
    else
    {
      if(this.playersForTeam2.length>0 &&  this.playersForTeam1.length>0)
      {
        this.teamB.players = this.playersForTeam2;
        this.teamA.players = this.playersForTeam1;
        this.match.teams.teamA = this.teamA;
        this.match.teams.teamB = this.teamB;

        this.loadingCtrl.create({
          message: 'Creating teams...'
        }).then(loader => {
          loader.present();
          let matchNumber = (this.loadedMatches.length)+1;
          this.match.id = 'match'+matchNumber;
          this.match.matchStatus = {
            status : 'live',
            whoWon : '',
            wonBy : ''
          }  //before starting the match
          this.match.scoreboard = {
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
          this.apiService.onMatchCreated(this.match).subscribe(result => {
            if(result){
             console.log("Match Created");
             loader.dismiss();
            }
             else
             console.log('Error occured while creating match');
          })
             loader.onDidDismiss().then(() => {
                this.toastCtrl.create({
                  message: 'Both Team Created!!',
                  color: 'success',
                  position: 'bottom',
                  duration: 2000
                }).then(toast => {
                  toast.present();
                  toast.onDidDismiss().then(()=> {
                    this.modalCtrl.create({
                      component: BatBowlSelectionComponent,
                      componentProps: {match : this.match}
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
    }
  }

  ngOnDestroy()
  {
    if(this.playersSub)
    this.playersSub.unsubscribe();
    if(this.matchSub)
    this.matchSub.unsubscribe();
  }
}
