import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActionSheetController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { Match } from '../models/match';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit,OnDestroy {
  matchStatus : string = 'new';
  loadedMatches : Match[] = [];
  currentMatch : Match = undefined;
  currentMatchStatus : string = undefined;
  private matchSub : Subscription;
   //https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Game/29052021
  constructor(private loadingCtrl:LoadingController,private toastCtrl:ToastController,private apiService:ApiServiceService) {

  }
  
 ngOnInit() {
  console.log('1. home_init');
  this.matchSub = this.apiService.todaysMatches.subscribe(matches => {
    if(matches)
    {
      this.loadedMatches = matches;
      this.currentMatch = this.loadedMatches[this.loadedMatches.length-1];
      if(this.currentMatch)
      this.currentMatchStatus = this.currentMatch.matchStatus.status;
    }
})

  }
  ionViewWillEnter()
  {
    console.log('2. home_view');
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

 /* addPlayers()
  {
    // this.apiService.addPlayers(this.enteredPlayers,this.enteredPlayers.split(",").length);
  } */
  career()
  {
    this.toastCtrl.create({
      message: 'Career Coming Soon!!',
      color: 'secondary',
      position: 'bottom',
      duration: 3000
    }).then(toast => {
      toast.present();
    })
  }

  ngOnDestroy()
  {
    if(this.matchSub)
    this.matchSub.unsubscribe();
  }
}
