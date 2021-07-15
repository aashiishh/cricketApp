import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ApiServiceService } from '../api-service.service';
import { Match } from '../models/match';
import { Player } from '../models/players';
import { Team } from '../models/team';
import { Teams } from '../models/teams';

@Component({
  selector: 'app-bat-bowl-selection',
  templateUrl: './bat-bowl-selection.component.html',
  styleUrls: ['./bat-bowl-selection.component.scss'],
})
export class BatBowlSelectionComponent implements OnInit {
  @Input() match : Match;
  batTeam : string;
  bowlTeam : string;
  dispTeamForBat : Player[];
  dispTeamForBowl : Player[];
  firstBatsman : string;
  firstBowler : string;
  constructor(private modalCtrl: ModalController,private service:ApiServiceService,private router:Router) { }

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
    if(this.match.teams.teamA.bat_bowl_first === 'bat')
    {
      this.match.teams.teamA.players.forEach(player => {
           if(player.name === this.firstBatsman){
              player.onPitch = true;
          }
          else
            player.onPitch = false;
            player.isWicket = false;
      })
    }
    else
    {
        this.match.teams.teamB.players.forEach(player => {
          if(player.name === this.firstBatsman){
            player.onPitch = true;
          }
          else
            player.onPitch = false;
            player.isWicket = false;
        })
    }
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
        })
      }
    }
  }

  startMatch()
  {
    /*this.modalCtrl.dismiss({
      newMatchData : {
        batTeam : this.batTeam,
        bowTeam : this.bowlTeam,
        firstBatsman : this.firstBatsman,
        firstBowler : this.firstBowler,
        match : this.match
      }
    },'confirm');*/
      this.modalCtrl.dismiss(); 
  }

  ionViewWillLeave()
  {
    console.log(this.match)
    this.service.onUpdateBatBowlSelectionOrMatchScore(this.match).subscribe(result => {
    });
  }
}
