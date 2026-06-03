import { Component, Input, OnInit } from '@angular/core';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { ApiServiceService } from '../api-service.service';
import { Match } from '../models/match';
import { Player } from '../models/players';

@Component({
  selector: 'app-switch-display',
  templateUrl: './switch-display.component.html',
  styleUrls: ['./switch-display.component.scss'],
  standalone: false
})
export class SwitchDisplayComponent implements OnInit {
  @Input() teams: {
    battingTeam: Player[],
    bowlingTeam: Player[]
  } = {
    battingTeam: [],
    bowlingTeam: []
  }
  message : string = '';
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
  firstBatsman: string;
  firstNonStriker: string;
  firstBowler: string;
  isSaving = false;
  constructor(private modalCtrl: ModalController,private loadingCtrl:LoadingController,private service:ApiServiceService, private toastCtrl: ToastController) {

  }

  ngOnInit() {
    if(this.match.teams.teamA.currentStatus === 'bat')
        this.message = 'Team '+this.match.teams.teamB.name+' required '+(this.match.scoreboard.teamA.runs+1)+' runs from '+this.match.teamOvers.oversCount+' overs'
    else
        this.message = 'Team '+this.match.teams.teamA.name+' required '+(this.match.scoreboard.teamB.runs+1)+' runs from '+this.match.teamOvers.oversCount+' overs'
   }
  ionViewWillEnter()
  {

  }

  onPlayerDidSelectForBatting(value) {
    console.log("Opening Batsman - ", value.detail.value)
    this.firstBatsman = value.detail.value;

  }
  onPlayerDidSelectForNonStriker(value) {
    console.log("Opening Non-Striker - ", value.detail.value)
    this.firstNonStriker = value.detail.value;
  }
  onPlayerDidSelectForBowling(value) {
    console.log("Opening Bowler - ", value.detail.value)
    this.firstBowler = value.detail.value;
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  onStart() {
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
    const previousMatchState = JSON.parse(JSON.stringify(this.match));
    if(this.match.teams.teamA.currentStatus === 'bat'){
      this.match.teams.teamA.currentStatus = 'bowl';
      this.match.teams.teamB.currentStatus = 'bat';
      this.match.teams.teamB.players.forEach(player => {
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
    this.match.teams.teamB.currentStatus = 'bowl';
    this.match.teams.teamA.currentStatus = 'bat';

    this.match.teams.teamB.players.forEach(player => {
      if(player.name === this.firstBowler)
        player.onPitch = true;
         else
           player.onPitch = false;
      player.isStriker = false;
    })
    this.match.teams.teamA.players.forEach(player => {
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
    this.loadingCtrl.create({
      message: 'starting match...'
    }).then(loader => {
      loader.present();
      this.service.onUpdateBatBowlSelectionOrMatchScore(this.match).subscribe({
        next: () => {
          this.isSaving = false;
          loader.dismiss();
          this.modalCtrl.dismiss({});
        },
        error: error => {
          this.isSaving = false;
          Object.assign(this.match, previousMatchState);
          loader.dismiss();
          this.toastCtrl.create({
            message: error?.message || 'Unable to start next innings.',
            color: 'danger',
            position: 'bottom',
            duration: 3000
          }).then(toast => toast.present());
        }
      })
    })
  }
}
