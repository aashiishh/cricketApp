import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AddPlayerComponent } from '../add-player/add-player.component';
import { ApiServiceService } from '../api-service.service';
import { AuthService } from '../auth/auth.service';
import { BatBowlSelectionComponent } from '../bat-bowl-selection/bat-bowl-selection.component';
import { Match } from '../models/match';
import { Overs } from '../models/overs';
import { Ball } from '../models/ball'
import { Player } from '../models/players';
import { Team } from '../models/team';
import { Teams } from '../models/teams';

@Component({
    selector: 'app-create-match1',
    templateUrl: './create-match1.page.html',
    styleUrls: ['./create-match1.page.scss'],
    standalone: false
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

  constructor(private apiService:ApiServiceService,private modalCtrl: ModalController,private loadingCtrl:LoadingController,private toastCtrl:ToastController,private router:Router,private authService:AuthService) { }

  get canManagePlayers() {
    return this.authService.canManagePlayers;
  }

  private createMatchPlayer(player: Player): Player {
    return {
      ...player,
      isSelected: false,
      onPitch: false,
      isWicket: false,
      ballsPlayed: 0,
      wicketsTaken: 0,
      runs: 0,
      runsGiven: 0,
      isStriker: false
    };
  }

  private showToast(message: string, color: string = 'danger') {
    this.toastCtrl.create({
      message,
      color,
      position: 'bottom',
      duration: 2500
    }).then(toast => {
      toast.present();
    });
  }

  private openStartMatchModal(loader?: HTMLIonLoadingElement) {
    loader?.dismiss();
    this.modalCtrl.create({
      component: BatBowlSelectionComponent,
      componentProps: {match : this.match},
      backdropDismiss: false
    }).then(modal => {
      modal.present();
      return modal.onDidDismiss();
    }).then(result => {
      if (result.role === 'confirm') {
        this.toastCtrl.create({
          message: 'Match created.',
          color: 'success',
          position: 'bottom',
          duration: 2000
        }).then(toast => {
          toast.present();
          toast.onDidDismiss().then(()=> {
            this.router.navigate(['/scoreboard', this.match.id]);
          });
        });
      }
    });
  }

  ngOnInit() {
    this.playersSub = this.apiService.players.subscribe(players => {
      this.loadedPlayers = players;
      this.updateDisplayedPlayers();
    });
    this.matchSub = this.apiService.todaysMatches.subscribe(matches => {
      this.loadedMatches = matches;
      console.log('All Matches - ',this.loadedMatches.length)
 })
    this.updateDisplayedPlayers();
  }

  ionViewWillEnter()
  {
      this.isLoading = true;
      this.apiService.fetchPlayersList().subscribe(() => {
        this.isLoading = false;
      }, () => {
        this.isLoading = false;
        this.showToast('Unable to load players.');
      });
      this.apiService.fetchTodaysMatchesList().subscribe(matches => {
        console.log(matches)
        this.isLoading = false;
      }, () => {
        this.isLoading = false;
        this.showToast('Unable to load today\'s matches.');
      });
  }

  onAddPlayer() {
    if (!this.canManagePlayers) {
      this.showToast('Only Admin can add players.', 'warning');
      return;
    }

    this.modalCtrl.create({
      component: AddPlayerComponent,
      backdropDismiss: false
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
            this.player = new Player(Math.random().toString(),resultData.data.newPlayerData.name,resultData.data.newPlayerData.desc,resultData.data.newPlayerData.imgUrl);
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
            }, () => {
              loader.dismiss();
              this.showToast('Unable to add player.');
            })
          });
        }
      }
    )
  }

  editPlayer(player: Player) {
    if (!this.canManagePlayers) {
      this.showToast('Only Admin can edit players.', 'warning');
      return;
    }

    this.modalCtrl.create({
      component: AddPlayerComponent,
      componentProps: { playerToEdit: player },
      backdropDismiss: false
    }).then(modal => {
      modal.present();
      return modal.onDidDismiss();
    }).then(resultData => {
      if (resultData.role === 'confirm') {
        const updatedPlayer: Player = {
          ...player,
          name: resultData.data.newPlayerData.name,
          description: resultData.data.newPlayerData.desc,
          imgUrl: resultData.data.newPlayerData.imgUrl
        };
        this.apiService.updatePlayer(updatedPlayer).subscribe(() => {
          this.loadedPlayers = this.loadedPlayers.map(existingPlayer => existingPlayer.id === updatedPlayer.id ? updatedPlayer : existingPlayer);
          this.playersForTeam1 = this.playersForTeam1.map(existingPlayer => existingPlayer.id === updatedPlayer.id ? this.createMatchPlayer(updatedPlayer) : existingPlayer);
          this.playersForTeam2 = this.playersForTeam2.map(existingPlayer => existingPlayer.id === updatedPlayer.id ? this.createMatchPlayer(updatedPlayer) : existingPlayer);
          this.updateDisplayedPlayers();
          this.showToast(updatedPlayer.name + ' updated.', 'success');
        }, () => {
          this.showToast('Unable to update player.');
        });
      }
    });
  }

  onTeamsNameSubmitted()
  {
    if(!this.form1.valid)
    return;
    const teamAName = String(this.form1.value['name1']).trim();
    const teamBName = String(this.form1.value['name2']).trim();
    const oversCount = Number(this.form1.value['oversCount']);

    if (!teamAName || !teamBName) {
      this.showToast('Please enter both team names.');
      return;
    }
    if (teamAName.toLowerCase() === teamBName.toLowerCase()) {
      this.showToast('Team names must be different.');
      return;
    }
    if (!Number.isInteger(oversCount) || oversCount < 1 || oversCount > 50) {
      this.showToast('Overs must be a whole number between 1 and 50.');
      return;
    }

    this.teamA.name = teamAName;
    this.teamB.name = teamBName;
    this.match.teamOvers.teamAOvers = new Overs([],0,0);
    this.match.teamOvers.teamBOvers = new Overs([],0,0);
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
    this.selectedTeam = "teamA";
    this.updateDisplayedPlayers();
  }

  onTeamDidChange() {
    this.updateDisplayedPlayers();
  }

  getSelectedTeamName() {
    if (this.selectedTeam === "teamA") {
      return this.teamA.name;
    }
    if (this.selectedTeam === "teamB") {
      return this.teamB.name;
    }
    return '';
  }

  getSelectedTeamCount() {
    if (this.selectedTeam === "teamA") {
      return this.playersForTeam1.length;
    }
    if (this.selectedTeam === "teamB") {
      return this.playersForTeam2.length;
    }
    return 0;
  }

  isTeamReady(team: string) {
    return team === "teamA" ? this.playersForTeam1.length >= 2 : this.playersForTeam2.length >= 2;
  }

  private isPlayerInTeam(player: Player, team: string) {
    const players = team === "teamA" ? this.playersForTeam1 : this.playersForTeam2;
    return players.some(selectedPlayer => selectedPlayer.id === player.id);
  }

  private updateDisplayedPlayers() {
    if (!this.loadedPlayers) {
      this.playerstoDisplay = [];
      return;
    }

    this.playerstoDisplay = this.loadedPlayers.filter(player => {
      if (this.selectedTeam === "teamA") {
        return !this.isPlayerInTeam(player, "teamB");
      }
      if (this.selectedTeam === "teamB") {
        return !this.isPlayerInTeam(player, "teamA");
      }
      return !this.isPlayerInTeam(player, "teamA") && !this.isPlayerInTeam(player, "teamB");
    });

    this.playerstoDisplay.forEach(player => {
      player.isSelected = this.selectedTeam ? this.isPlayerInTeam(player, this.selectedTeam) : false;
    });
  }

  onPlayerDidSelected(selectedPlayer : Player)
  {
    if (!this.selectedTeam) {
      selectedPlayer.isSelected = false;
      this.showToast('Please select a team first.');
      return;
    }

    if (this.selectedTeam === "teamA") {
      this.playersForTeam1 = this.playersForTeam1.filter(i => i.id !== selectedPlayer.id);
      this.playersForTeam2 = this.playersForTeam2.filter(i => i.id !== selectedPlayer.id);
      if (selectedPlayer.isSelected) {
        this.playersForTeam1.push(this.createMatchPlayer(selectedPlayer));
      }
    }

    if (this.selectedTeam === "teamB") {
      this.playersForTeam2 = this.playersForTeam2.filter(i => i.id !== selectedPlayer.id);
      this.playersForTeam1 = this.playersForTeam1.filter(i => i.id !== selectedPlayer.id);
      if (selectedPlayer.isSelected) {
        this.playersForTeam2.push(this.createMatchPlayer(selectedPlayer));
      }
    }

    this.teamA.players = this.playersForTeam1;
    this.teamB.players = this.playersForTeam2;
    this.updateDisplayedPlayers();
  }

  saveSelectedTeam() {
    if (!this.selectedTeam) {
      this.showToast('Please select a team.');
      return;
    }
    if (this.getSelectedTeamCount() < 2) {
      this.showToast('Select at least 2 players for ' + this.getSelectedTeamName() + '.');
      return;
    }

    const savedTeamName = this.getSelectedTeamName();
    if (this.selectedTeam === "teamA" && !this.isTeamReady("teamB")) {
      this.selectedTeam = "teamB";
    } else if (this.selectedTeam === "teamB" && !this.isTeamReady("teamA")) {
      this.selectedTeam = "teamA";
    }
    this.updateDisplayedPlayers();
    this.showToast(savedTeamName + ' saved.', 'success');
  }

  onCreateTeam()
  {
    if (this.playersForTeam1.length < 2 || this.playersForTeam2.length < 2) {
      this.showToast('Each team needs at least 2 players.');
      return;
    }

    this.teamB.players = this.playersForTeam2;
    this.teamA.players = this.playersForTeam1;
    this.match.teams.teamA = this.teamA;
    this.match.teams.teamB = this.teamB;

    this.loadingCtrl.create({
      message: 'Preparing match...'
    }).then(loader => {
          loader.present();
          let matchNumber = (this.loadedMatches.length)+1;
          this.match.id = 'Match'+matchNumber+'_'+Date.now();
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
          this.openStartMatchModal(loader);
       })
  }

  ngOnDestroy()
  {
    if(this.playersSub)
    this.playersSub.unsubscribe();
    if(this.matchSub)
    this.matchSub.unsubscribe();
  }
}
