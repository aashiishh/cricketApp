import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { ApiServiceService } from '../api-service.service';
import { Match } from '../models/match';
import { Player } from '../models/players';

@Component({
    selector: 'app-bat-bowl-selection',
    templateUrl: './bat-bowl-selection.component.html',
    styleUrls: ['./bat-bowl-selection.component.scss'],
    standalone: false
})
export class BatBowlSelectionComponent implements OnInit {
  @Input() match : Match = {
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
  };
  batTeam : string;
  bowlTeam : string;
  dispTeamForBat : Player[];
  dispTeamForBowl : Player[];
  firstBatsman : string;
  firstNonStriker : string;
  firstBowler : string;
  isSaving = false;
  constructor(
    private modalCtrl: ModalController,
    private service:ApiServiceService,
    private router:Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {}

  onBatTeamSelected(batTeam : string,bowlTeam : string)
  {
    this.batTeam = batTeam;
    this.bowlTeam = bowlTeam;
    console.log("Team ",this.batTeam," is Batting first")
    if(this.batTeam === this.match.teams.teamA.name)
        {
          this.match.teams.teamA.bat_bowl_first = 'bat';
          this.match.teams.teamB.bat_bowl_first = 'bowl';
          this.match.teams.teamB.currentStatus = 'bowl';
          this.match.teams.teamA.currentStatus = 'bat';
          this.dispTeamForBat = this.match.teams.teamA.players;
          this.dispTeamForBowl = this.match.teams.teamB.players;
        }
        else
        {
          this.match.teams.teamB.bat_bowl_first = 'bat';
          this.match.teams.teamA.bat_bowl_first = 'bowl';
          this.match.teams.teamA.currentStatus = 'bowl';
          this.match.teams.teamB.currentStatus = 'bat';
          this.dispTeamForBat = this.match.teams.teamB.players;
          this.dispTeamForBowl = this.match.teams.teamA.players;
        }
  }

  onPlayerDidSelectForBatting(value)
  {
    console.log("Opening Batsman - ",value.detail.value)
    this.firstBatsman = value.detail.value;
    this.setOpeningBatters();
  }
  onPlayerDidSelectForNonStriker(value)
  {
    console.log("Opening Non-Striker - ",value.detail.value)
    this.firstNonStriker = value.detail.value;
    this.setOpeningBatters();
  }
  setOpeningBatters()
  {
    const battingPlayers = this.match.teams.teamA.bat_bowl_first === 'bat'
      ? this.match.teams.teamA.players
      : this.match.teams.teamB.players;

    battingPlayers.forEach(player => {
      if(player.name === this.firstBatsman){
        player.onPitch = true;
        player.isWicket = false;
        player.isStriker = true;
      }
      else if(player.name === this.firstNonStriker){
        player.onPitch = true;
        player.isWicket = false;
        player.isStriker = false;
      }
      else {
        player.onPitch = false;
        player.isStriker = false;
      }
    })
  }
  onPlayerDidSelectForBowling(value)
  {
    console.log("Opening Bowler - ",value.detail.value)
    this.firstBowler = value.detail.value
    if(this.match.teams.teamA.bat_bowl_first === 'bowl')
    {
      this.match.teams.teamA.players.forEach(player => {
          if(player.name === this.firstBowler)
            player.onPitch = true;
          else
          player.onPitch = false;
          player.isStriker = false;
      })
    }
    else
    {
      {
        this.match.teams.teamB.players.forEach(player => {
            if(player.name === this.firstBowler)
              player.onPitch = true;
              else
              player.onPitch = false;
            player.isStriker = false;
        })
      }
    }
  }

  startMatch()
  {
    if (!this.firstBatsman || !this.firstNonStriker || this.firstBatsman === this.firstNonStriker || !this.firstBowler) {
      this.toastCtrl.create({
        message: 'Select striker, non-striker, and opening bowler.',
        color: 'warning',
        position: 'bottom',
        duration: 2500
      }).then(toast => toast.present());
      return;
    }

    this.isSaving = true;
    this.loadingCtrl.create({
      message: 'Starting match...'
    }).then(loader => {
      loader.present();
      const saveRequest: any = this.match.createdAt
        ? this.service.onUpdateBatBowlSelectionOrMatchScore(this.match)
        : this.service.onMatchCreated(this.match);

      saveRequest.subscribe({
        next: () => {
          this.isSaving = false;
          loader.dismiss();
          this.modalCtrl.dismiss({ started: true }, 'confirm');
        },
        error: error => {
          this.isSaving = false;
          loader.dismiss();
          this.toastCtrl.create({
            message: error?.message || 'Unable to start match.',
            color: 'danger',
            position: 'bottom',
            duration: 3000
          }).then(toast => toast.present());
        }
      });
    });
  }

  cancel()
  {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
