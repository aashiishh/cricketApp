import { Component, OnDestroy, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { Match } from '../models/match';
import { SelectionComponent } from '../selection/selection.component';

interface matchData{
  matchId:string,
  maxRuns:number,
  rPlayer : string,
  maxWickets : number
  wPlayer : string
} 

@Component({
  selector: 'app-todays-matches',
  templateUrl: './todays-matches.page.html',
  styleUrls: ['./todays-matches.page.scss'],
})
export class TodaysMatchesPage implements OnInit,OnDestroy {

  isLoading : boolean = false;
  loadedMatches : Match[] = [];
  data : matchData[] = [];
  maxWicket : number = 0;
  currentMatch : Match = undefined;
  currentMatchStatus : string = undefined;
  private matchSub : Subscription;
   //https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Game/29052021
  constructor(private loadingCtrl:LoadingController,private apiService:ApiServiceService,private modalCtrl:ModalController) {

  }
  
 ngOnInit() {
  this.matchSub = this.apiService.todaysMatches.subscribe(matches => {
    if(matches)
    {
      if(this.data.length > 0)
        this.data = [];
      this.loadedMatches = matches;
      this.isLoading = true;
      this.loadedMatches.forEach(match => {
            let mData : matchData = {
              matchId : '',
              maxRuns : 0,
              maxWickets : 0,
              rPlayer : '',
              wPlayer : ''
            }
            mData.matchId = match.id;
            match.teams.teamA.players.forEach(player => {
                const runs = player.runs;
                const wickets = player.wicketsTaken;
                if(mData.maxRuns < runs){
                 mData.maxRuns = runs;
                 mData.rPlayer = player.name;
                }
                if(mData.maxWickets < wickets)
                {
                mData.maxWickets = wickets; 
                mData.wPlayer = player.name
                }
            })
            match.teams.teamB.players.forEach(player => {
              const runs = player.runs;
              const wickets = player.wicketsTaken;
              if(mData.maxRuns < runs){
                mData.maxRuns = runs;
                mData.rPlayer = player.name;
               }
               if(mData.maxWickets < wickets)
               {
               mData.maxWickets = wickets; 
               mData.wPlayer = player.name
               }
          })
          this.data.push(mData);
      })
      this.isLoading = false;
     /* this.currentMatch = this.loadedMatches[this.loadedMatches.length-1];
      if(this.currentMatch)
      this.currentMatchStatus = this.currentMatch.matchStatus.status;*/
    }
})

  }
  ionViewWillEnter()
  {

    this.loadingCtrl.create({
      message: 'please wait...'
    }).then(loader => {
      loader.present();
    this.apiService.fetchTodaysMatchesList().subscribe(() => {
      //updating matches list...
      loader.dismiss();
    });
  });
  }
  viewMatchDetails(match : Match)
{
  this.modalCtrl.create({
    component: SelectionComponent,
    componentProps: {match : match}
  }).then(modal => {
    modal.present();
    return modal.onDidDismiss();
  })
}
  ngOnDestroy()
  {
    if(this.matchSub)
    this.matchSub.unsubscribe();
  }
}
