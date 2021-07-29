import { Component, Input, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { ApiServiceService } from '../api-service.service';
import { Match } from '../models/match';
import { Team } from '../models/team';

@Component({
  selector: 'app-switch-display',
  templateUrl: './switch-display.component.html',
  styleUrls: ['./switch-display.component.scss'],
})
export class SwitchDisplayComponent implements OnInit {
  @Input() teams: {
    battingTeam: Team,
    bowlingTeam: Team
  }
  message : string = '';
  @Input() match : Match;
  firstBatsman: string;
  firstBowler: string;
  constructor(private modalCtrl: ModalController,private loadingCtrl:LoadingController,private service:ApiServiceService) {
    
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
  onPlayerDidSelectForBowling(value) {
    console.log("Opening Bowler - ", value.detail.value)
    this.firstBowler = value.detail.value;
  }

  onStart() {
    if(this.match.teams.teamA.currentStatus === 'bat'){
      this.match.teams.teamA.currentStatus = 'bowl';
      this.match.teams.teamB.currentStatus = 'bat';
      this.match.teams.teamB.players.forEach(player => {
        if(player.name === this.firstBatsman){
           player.onPitch = true;
           player.isWicket = false;
        }
        else
           player.onPitch = false;
      })
      this.match.teams.teamA.players.forEach(player => {
        if(player.name === this.firstBowler)
          player.onPitch = true;
           else
           player.onPitch = false;
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
    })
    this.match.teams.teamA.players.forEach(player => {
      if(player.name === this.firstBatsman){
        player.onPitch = true;
        player.isWicket = false;
     }
         else
           player.onPitch = false;
    })
  }
    this.loadingCtrl.create({
      message: 'starting match...'
    }).then(loader => {
      loader.present();
      this.service.onUpdateBatBowlSelectionOrMatchScore(this.match).subscribe(() => { 
          loader.dismiss();
          this.modalCtrl.dismiss({});
      })
    })
  }
}
