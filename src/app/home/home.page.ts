import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { AuthService } from '../auth/auth.service';
import { Match } from '../models/match';

@Component({
    selector: 'app-home',
    templateUrl: 'home.page.html',
    styleUrls: ['home.page.scss'],
    standalone: false
})
export class HomePage implements OnInit,OnDestroy {
  matchStatus : string = 'new';
  loadedMatches : Match[] = [];
  currentMatch : Match = undefined;
  currentMatchStatus : string = undefined;
  private matchSub : Subscription;
   //https://gali-cricket-27fdd-default-rtdb.asia-southeast1.firebasedatabase.app/Cricket/Game/29052021
  constructor(
    private alertCtrl:AlertController,
    private loadingCtrl:LoadingController,
    private toastCtrl:ToastController,
    private apiService:ApiServiceService,
    private authService: AuthService
  ) {

  }

 get liveMatches() {
  return this.loadedMatches.filter(match => match.matchStatus?.status === 'live');
 }

 get liveMatchesButtonText() {
  return this.liveMatches.length === 1 ? 'Live Match' : 'Live Matches';
 }

 get liveMatchRoute() {
  return this.liveMatches.length === 1 ? ['/scoreboard', this.liveMatches[0].id] : ['/todays-matches'];
 }

 get canManageRoles() {
  return this.authService.canManageRoles;
 }

 get currentUser() {
  return this.authService.currentUser;
 }

 get displayName() {
  return this.currentUser?.displayName || this.currentUser?.email || 'Player';
 }

 get displayPhoto() {
  return this.currentUser?.photoUrl || '';
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
    }, () => {
      loader.dismiss();
      this.toastCtrl.create({
        message: 'Unable to load matches.',
        color: 'danger',
        position: 'bottom',
        duration: 2500
      }).then(toast => {
        toast.present();
      });
    });
  });
  }

  ngOnDestroy()
  {
    if(this.matchSub)
    this.matchSub.unsubscribe();
  }

  async logout()
  {
    const alert = await this.alertCtrl.create({
      header: 'Logout?',
      message: 'Are you really want to logout?',
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Yes',
          role: 'destructive',
          handler: () => this.authService.logout()
        }
      ]
    });
    await alert.present();
  }
}
