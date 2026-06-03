import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { AuthService } from '../auth/auth.service';
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
  standalone: false
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
  constructor(
    private loadingCtrl:LoadingController,
    private apiService:ApiServiceService,
    private modalCtrl:ModalController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private authService: AuthService
  ) {

  }

 get canManageMatches() {
  return this.authService.canManageMatches;
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
                const runs = player.runs ?? 0;
                const wickets = player.wicketsTaken ?? 0;
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
              const runs = player.runs ?? 0;
              const wickets = player.wicketsTaken ?? 0;
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
    }, () => {
      loader.dismiss();
      this.toastCtrl.create({
        message: 'Unable to load today\'s matches.',
        color: 'danger',
        position: 'bottom',
        duration: 2500
      }).then(toast => {
        toast.present();
      });
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

async confirmDeleteMatch(match: Match) {
  if (!this.canManageMatches) {
    this.showToast('Only Admin can delete matches.', 'warning');
    return;
  }

  const alert = await this.alertCtrl.create({
    header: 'Delete match?',
    message: 'This will permanently delete '+match.teams.teamA.name+' vs '+match.teams.teamB.name+'. This action cannot be undone.',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Delete',
        role: 'destructive',
        handler: () => this.deleteMatch(match)
      }
    ]
  });
  await alert.present();
}

private deleteMatch(match: Match) {
  this.loadingCtrl.create({
    message: 'Deleting match...'
  }).then(loader => {
    loader.present();
    this.apiService.deleteMatch(match).subscribe({
      next: () => {
        loader.dismiss();
        this.loadedMatches = this.loadedMatches.filter(existingMatch => existingMatch.id !== match.id);
        this.data = this.data.filter(item => item.matchId !== match.id);
        this.showToast('Match deleted.', 'success');
      },
      error: error => {
        loader.dismiss();
        this.showToast(error?.message || 'Unable to delete match.', 'danger');
      }
    });
  });
}

private showToast(message: string, color: string) {
  this.toastCtrl.create({
    message,
    color,
    position: 'bottom',
    duration: 2500
  }).then(toast => {
    toast.present();
  });
}
  ngOnDestroy()
  {
    if(this.matchSub)
    this.matchSub.unsubscribe();
  }
}
