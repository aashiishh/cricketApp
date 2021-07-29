import { Component, Input, OnInit } from '@angular/core';
import { ActionSheetController, LoadingController, ModalController } from '@ionic/angular';
import { Match } from '../models/match';
import { Player } from '../models/players';
import { Team } from '../models/team';

@Component({
  selector: 'app-selection',
  templateUrl: './selection.component.html',
  styleUrls: ['./selection.component.scss'],
})
export class SelectionComponent implements OnInit {
  @Input() match : Match; 
  winTeam : Team;
  lostTeam : Team;
  constructor(public actionSheetController: ActionSheetController,private loadingCtrl:LoadingController,private modalCtrl:ModalController) {}

  ngOnInit() {
    
      
     let winTeamName = this.match.matchStatus.whoWon;
     if(winTeamName !== 'NA')
     {
      
     if(this.match.teams.teamA.name === winTeamName){
      this.winTeam = this.match.teams.teamA;
      this.lostTeam = this.match.teams.teamB;
     }
      else
      {
        this.winTeam = this.match.teams.teamB;
        this.lostTeam = this.match.teams.teamA;
      }
    }
    else
    {
        this.winTeam = this.match.teams.teamA;
        this.lostTeam = this.match.teams.teamB;
    }  
    this.winTeam.players.forEach(player => {
      console.log(player.isWicket)
    })
    this.lostTeam.players.forEach(player => {
      console.log(player.isWicket)
    })

  }
  ionViewWillEnter() {

    this.loadingCtrl.create({
      message: 'getting match details...'
    }).then(loader => {
      loader.present();
      setTimeout(()=>{
        loader.dismiss();
      },1000)
    })

  }
  close()
  {
    this.modalCtrl.dismiss();
  }

}
