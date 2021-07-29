import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, IonSelect, LoadingController, ModalController, PopoverController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { Ball } from '../models/ball';
import { Match } from '../models/match';
import { Player } from '../models/players';
import { Scoreboard } from '../models/scoreboard';
import { Team } from '../models/team';
import { TeamOvers } from '../models/teamOvers';
import { ScoreboardMenuComponent } from '../scoreboard-menu/scoreboard-menu.component';
import { SwitchDisplayComponent } from '../switch-display/switch-display.component';

@Component({
  selector: 'app-scoreboard',
  templateUrl: './scoreboard.page.html',
  styleUrls: ['./scoreboard.page.scss'],
})
export class ScoreboardPage implements OnInit, OnDestroy {
  @ViewChild('wt', { static: false }) wicketType: IonSelect;
  loadedMatches: Match[] = [];
  displayMessage : string = '';
  currentPopover = null;
  batsman: Player = {id : '',name: ''};             // to display current batsman
  bowler: Player = {id : '',name: ''};             // to display current bowler
  teamABat: boolean = false;       // true if teamA is Batting
  teamBBat: boolean = false;      // true if teamB is Batting
  bowlingTeam: Team = {
    name: '',
    bat_bowl_first: '',
    players: []
  }                               // contains all player of bowling Team
  battingTeam: Team = {
    name: '',
    bat_bowl_first: '',
    players: []
  }                               // contains all player of batting Team
  scoreboard: Scoreboard = {

    teamA: {
      overs: 0,
      runs: 0,
      balls: 0,
      wickets: 0
    },
    teamB: {
      overs: 0,
      runs: 0,
      balls: 0,
      wickets: 0
    }
  }                                // for current match scoreboard

  teamOvers: TeamOvers = {
    teamAOvers: undefined,
    teamBOvers: undefined,
    oversCount : 0
  }
  currentMatch: Match = {
    id: '',
    teams: undefined,
    scoreboard: undefined,
    teamOvers: this.teamOvers,
    matchStatus: undefined
  }
  isLoading: boolean = false;
  private matchSub: Subscription;
  constructor(private alertController:AlertController,private modalCtrl: ModalController,private actionSheetController: ActionSheetController, private toastCtrl: ToastController, private service: ApiServiceService, private loadingCtrl: LoadingController,public popoverController: PopoverController,private router:Router) {}

  ngOnInit() {
    this.matchSub = this.service.todaysMatches.subscribe(matches => {
      if (matches) {
        this.loadedMatches = matches;
        this.currentMatch = this.loadedMatches[this.loadedMatches.length - 1];
        this.teamOvers = this.currentMatch.teamOvers;
        this.scoreboard = this.currentMatch.scoreboard;
        if (this.currentMatch.teams.teamA.currentStatus === 'bat') {
          this.teamABat = true;
          this.teamBBat = false;
          this.battingTeam = this.currentMatch.teams.teamA;
          this.battingTeam.players.forEach(player => {
            if (player.onPitch && !player.isWicket)
              this.batsman = player;
          })
      
          this.bowlingTeam = this.currentMatch.teams.teamB;
          this.bowlingTeam.players.forEach(player => {
            if (player.onPitch)
              this.bowler = player;
          })
      
        }
        if (this.currentMatch.teams.teamB.currentStatus === 'bat') {
          this.teamBBat = true;
          this.teamABat = false;
          this.battingTeam = this.currentMatch.teams.teamB;
          this.battingTeam.players.forEach(player => {
            if (player.onPitch && !player.isWicket)
              this.batsman = player;
          })
          this.bowlingTeam = this.currentMatch.teams.teamA;
          this.bowlingTeam.players.forEach(player => {
            if (player.onPitch)
              this.bowler = player;
          })
        }
      }
    })

  }
  ionViewWillEnter() {
    this.isLoading = true;
    this.loadingCtrl.create({
      message: 'setting up scoreboard...'
    }).then(loader => {
      loader.present();
      this.service.fetchTodaysMatchesList().subscribe(() => {
        loader.dismiss();
        this.isLoading = false;
        this.toastCtrl.create({
          message: 'Match is Live!!',
          color: 'dark',
          position: 'middle',
          duration: 2000
        }).then(toast => {
          toast.present();
        });
      });
    })
  }

  onBallDone(runs: number, status: string) {
    const ball: Ball = {
      baller: this.bowler.name,
      batsman: this.batsman.name,
      run: runs+'',
      status: status
    }
    this.bowler.runsGiven += runs;
    if (this.teamABat) {
      this.scoreboard.teamA.runs = this.scoreboard.teamA.runs + runs;
      if (status === 'runs' || status === 'dot' || status === 'iopa')
      {this.scoreboard.teamA.balls++;
      this.batsman.ballsPlayed++; 
    this.batsman.runs += runs;
}
      if(this.teamOvers.teamAOvers.currentBall === 0)
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls.push(ball);
      this.teamOvers.teamAOvers.currentBall++;
      if (this.scoreboard.teamA.balls === 6) 
          this.afterSixBalls(false);  //if 6 balls done
      else {
        if(this.currentMatch.teams.teamA.bat_bowl_first === 'bowl')
        {
          let displayMessage = '';
          const runs = (this.currentMatch.scoreboard.teamB.runs + 1) - this.currentMatch.scoreboard.teamA.runs;
            if(runs <= 0)
            {
              this.currentMatch.matchStatus.status = 'end';
              const name = this.currentMatch.teams.teamA.name;
              this.currentMatch.matchStatus.whoWon = name;
              let count = 0;
              this.currentMatch.teams.teamA.players.forEach(p => {
                  if(!p.isWicket)
                     count++;
              })
              if(count > 1){
              this.currentMatch.matchStatus.wonBy = count+" wickets";
              displayMessage = "Team "+name+" has won the Match by "+count+" wickets";
              }
              else{
              this.currentMatch.matchStatus.wonBy = 1+" wicket";
              displayMessage = "Team "+name+" has won the Match by "+1+" wicket";
              }
              this.endLoading(displayMessage);
            }
            this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => {})
        }
        else
          this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
      }
    }
    if (this.teamBBat) {
      this.scoreboard.teamB.runs = this.scoreboard.teamB.runs + runs;
   if (status === 'runs' || status === 'dot' || status === 'iopa')
    { this.scoreboard.teamB.balls++;
     this.batsman.ballsPlayed++;
     this.batsman.runs += runs;
    }
     if(this.teamOvers.teamBOvers.currentBall === 0)
     this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls[0] = ball;
     else
     this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls.push(ball);
     this.teamOvers.teamBOvers.currentBall++;
      if (this.scoreboard.teamB.balls === 6)
        this.afterSixBalls(false);  //if 6 balls done
      else {
        if(this.currentMatch.teams.teamB.bat_bowl_first === 'bowl')
        {
          let displayMessage = '';
          const runs = (this.currentMatch.scoreboard.teamA.runs + 1) - this.currentMatch.scoreboard.teamB.runs;
            if(runs <= 0)
            {
              this.currentMatch.matchStatus.status = 'end';
              const name = this.currentMatch.teams.teamB.name;
              this.currentMatch.matchStatus.whoWon = name;
              let count = 0;
              this.currentMatch.teams.teamB.players.forEach(p => {
                  if(!p.isWicket)
                     count++;
              })
              if(count > 1){
              this.currentMatch.matchStatus.wonBy = count+" wickets";
              displayMessage = "Team "+name+" has won the Match by "+count+" wickets";
              }
              else{
              this.currentMatch.matchStatus.wonBy = 1+" wicket";
              displayMessage = "Team "+name+" has won the Match by "+1+" wicket";
              }
              this.endLoading(displayMessage);
            }
            this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
        }
        else
          this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
      }
    }
  }

  onWicket(value: string) {
    if (value) {
      this.toastCtrl.create({
        message: 'Its a Wicket!!',
        color: 'danger',
        position: 'bottom',
        duration: 1500
      }).then(toast => {
        toast.present();
        return toast.onDidDismiss();
      }).then(() => {

        if (value === 'b' || value === 'd')
          this.onBowled(value);
        else if (value)
          this.presentActionSheet();
      });
      this.bowler.wicketsTaken++;
      this.wicketType.value = "";
    }
  }
  onBowled(status: string) {
    const ball: Ball = {
      baller: this.bowler.name,
      batsman: this.batsman.name,
      run: '0',
      status: 'wicket',
      wicket_type: ''
    }
    if (status === 'b')
      ball.wicket_type = 'bowled';
    if (status === 'd')
      ball.wicket_type = 'DOPA';


    if (this.teamABat) {

      this.scoreboard.teamA.wickets += 1;
      this.scoreboard.teamA.balls += 1;
      this.batsman.ballsPlayed++;
      if(this.teamOvers.teamAOvers.currentBall === 0)
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls.push(ball);
      this.teamOvers.teamAOvers.currentBall++;

      if (this.scoreboard.teamA.balls === 6) 
        this.afterSixBalls(true); //wicket on last ball of over
      else {
        this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
        this.presnetActionSheetForBatsmanSelectionAfterWicket(false,false); //wicket not on last ball of over
      }
    }
    if (this.teamBBat) {
      this.scoreboard.teamB.wickets += 1;
      this.scoreboard.teamB.balls += 1;
      this.batsman.ballsPlayed++;
      if(this.teamOvers.teamBOvers.currentBall === 0)
      this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls.push(ball);
      this.teamOvers.teamBOvers.currentBall++;
      if (this.scoreboard.teamB.balls === 6)
        this.afterSixBalls(true); //wicket on last ball of over
      else {
        this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
        this.presnetActionSheetForBatsmanSelectionAfterWicket(false,false); //wicket not on last ball of over
      }
    }
  }
  ondidCatch(caughtBy: string) {
    const ball: Ball = {
      baller: this.bowler.name,
      batsman: this.batsman.name,
      run: '0',
      status: 'wicket',
      wicket_type: 'caught and bowled',
      caught_by: caughtBy
    }


    if (this.teamABat) {
      this.scoreboard.teamA.wickets += 1;
      this.scoreboard.teamA.balls += 1;
      this.batsman.ballsPlayed++;
      if(this.teamOvers.teamAOvers.currentBall === 0)
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls.push(ball);
      this.teamOvers.teamAOvers.currentBall++;
      if (this.scoreboard.teamA.balls === 6)
        this.afterSixBalls(true);  //true as over and wicket both happend
      else {
        this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
        this.presnetActionSheetForBatsmanSelectionAfterWicket(false,false); //only wicket not over completed  then sending false
      }
    }
    if (this.teamBBat) {
      this.scoreboard.teamB.wickets += 1;
      this.scoreboard.teamB.balls += 1;
      this.batsman.ballsPlayed++;
      if(this.teamOvers.teamBOvers.currentBall === 0)
      this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls.push(ball);
      this.teamOvers.teamBOvers.currentBall++;
      if (this.scoreboard.teamB.balls === 6)
        this.afterSixBalls(true); //wicket on last ball of over
      else {
        this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
        this.presnetActionSheetForBatsmanSelectionAfterWicket(false,false); //wicket not on last ball of over
      }
    }
  }
  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Who Caught the ball??',
      cssClass: 'my-custom-class',
      buttons: this.createButtonsForCatch()
    });
    await actionSheet.present();
  }
  createButtonsForCatch() {
    let buttons = [];
    for (var index in this.bowlingTeam.players) {
      let name = this.bowlingTeam.players[index].name;
      let button = {
        text: name,
        // icon: this.possibleButtons[index].icon,
        handler: () => {
          this.ondidCatch(name)
        }
      }
      buttons.push(button);
    }
    return buttons;
  }

  createButtonsForOver() {
    let buttons = [];
    
    for (var index in this.bowlingTeam.players) {
      let player = this.bowlingTeam.players[index];
      if (!player.onPitch) {
        let button = {
          text: player.name,
          handler: () => {
            if (!this.teamABat) {
              this.currentMatch.teams.teamA.players.forEach(p => {
                if (p.name === player.name){
                  p.onPitch = true;
                }
                if(this.bowler.name === p.name)
                  p.onPitch = false;
              })
            }
            if (!this.teamBBat) {
              this.currentMatch.teams.teamB.players.forEach(p => {
                if (p.name === player.name){
                  p.onPitch = true;
                }
                if(this.bowler.name === p.name)
                  p.onPitch = false;
              })
            }
            this.bowler = player;
            this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
          }
        }
        buttons.push(button);
      }
    }
    return buttons;

  }

  createButtonsForBatsmanSelectionAfterSwitch() {
    let buttons = [];
    for (var index in this.battingTeam.players) {
      let player = this.battingTeam.players[index];
      if (!player.onPitch && !player.isWicket) {  //displaying only those batsman whose onPitch is false(i.e not yet batted)
        let button = {
          text: player.name,
          // icon: this.possibleButtons[index].icon,
          handler: () => {
            // this.battingTeam.players[index].onPitch=true;
            if (this.teamABat) {
              this.currentMatch.teams.teamA.players.forEach(p => {
                if (p.name === player.name){
                  p.onPitch = true;
                  p.isWicket = false;
                }
                if (this.batsman.name === p.name) {
                  p.onPitch = false;
                }
              })
            }
            if (this.teamBBat) {
              this.currentMatch.teams.teamB.players.forEach(p => {
                if (p.name === player.name){
                  p.onPitch = true;
                  p.isWicket = false;
                }
                if (this.batsman.name === p.name) {
                  p.onPitch = false;
                }
              })
            }
            this.batsman = player;
            this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
          }
        }
        buttons.push(button);
      }
    }
    return buttons;
  }

  createButtonsForBatsmanSelectionAfterWicket(ifLastBall: boolean,isDismiss : boolean) {  //ifLastBall true when wicket on last ball
    let buttons = [];
    for (var index in this.battingTeam.players) {
      let player = this.battingTeam.players[index];
      if (!player.onPitch && !player.isWicket) {  //displaying only those batsman whose onPitch is false(i.e not yet batted)
        let button = {
          text: player.name,
          // icon: this.possibleButtons[index].icon,
          handler: () => {

            if (this.teamABat) {
              this.currentMatch.teams.teamA.players.forEach(p => {
                if (p.name === player.name){
                  p.onPitch = true;
                  p.isWicket = false;
                }
                if (this.batsman.name === p.name) {  // setting current Batsman as out
                  p.onPitch = false;
                  p.isWicket = true;
                }
              })
              if(isDismiss){
               this.scoreboard.teamA.wickets++;
              }
            }
            if (this.teamBBat) {
              this.currentMatch.teams.teamB.players.forEach(p => {
                if (p.name === player.name){
                  p.onPitch = true;
                  p.isWicket = false;
                }
                if (this.batsman.name === p.name) {
                  p.onPitch = false;
                  p.isWicket = true;
                  
                }
              })
              if(isDismiss){
               this.scoreboard.teamB.wickets++;
              }
            }
            this.batsman = player;
            this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
            if (ifLastBall) {
              this.toastCtrl.create({
                message: 'Over Completed!!',
                color: 'dark',
                position: 'bottom',
                duration: 1000
              }).then(toast => {
                toast.present();
                toast.onDidDismiss().then(() => {
                  this.presnetActionSheetForOver();
                });
              })
            }

          }
        }
        buttons.push(button);
      }
    }
    return buttons;
  }
  async presnetActionSheetForBatsmanSelectionAfterSwitch() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Select next Batsman',
      cssClass: 'my-custom-class',
      buttons: this.createButtonsForBatsmanSelectionAfterSwitch()
    });
    await actionSheet.present();
  }
  async presnetActionSheetForBatsmanSelectionAfterWicket(ifLastBall: boolean,isDismiss:boolean) {
    if(this.teamABat)
    {
        if(this.scoreboard.teamA.wickets == this.battingTeam.players.length)
        this.onSwtich(true)
        else
        {
          const actionSheet = await this.actionSheetController.create({
            header: 'Select next Batsman',
            cssClass: 'my-custom-class',
            buttons: this.createButtonsForBatsmanSelectionAfterWicket(ifLastBall,isDismiss)
          });
          await actionSheet.present();
        }
         
    }
    else
    {
      if(this.scoreboard.teamB.wickets == this.battingTeam.players.length)
        this.onSwtich(true)
      else
      {
        const actionSheet = await this.actionSheetController.create({
          header: 'Select next Batsman',
          cssClass: 'my-custom-class',
          buttons: this.createButtonsForBatsmanSelectionAfterWicket(ifLastBall,isDismiss)
        });
        await actionSheet.present();
      }
    }
    
  }

  async presnetActionSheetForOver() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Select next bowler',
      cssClass: 'my-custom-class',
      buttons: this.createButtonsForOver()
    });
    await actionSheet.present();
  
  }

  onOverCompleted() {

    let finishMatch : boolean = false;
    if (this.teamABat) {

      if(this.currentMatch.teams.teamA.bat_bowl_first === 'bowl')
      {
        const runs = (this.currentMatch.scoreboard.teamB.runs + 1) - this.currentMatch.scoreboard.teamA.runs;
        let displayMessage = "";
        if(runs <= 0)
          {
            this.currentMatch.matchStatus.status = 'end';
            const name = this.currentMatch.teams.teamA.name;
            this.currentMatch.matchStatus.whoWon = name;
            let count = 0;
            this.currentMatch.teams.teamA.players.forEach(p => {
                if(!p.isWicket)
                   count++;
            })
            if(count > 1){
            this.currentMatch.matchStatus.wonBy = count+" wickets";
            displayMessage = "Team "+name+" has won the Match by "+count+" wickets";
            }
            else{
            this.currentMatch.matchStatus.wonBy = 1+" wicket";
            displayMessage = "Team "+name+" has won the Match by "+1+" wicket";
            }
            this.endLoading(displayMessage);
            finishMatch = true;
          }
      }
      this.teamOvers.teamAOvers.currentOver++;
      this.scoreboard.teamA.overs = this.teamOvers.teamAOvers.currentOver;
      this.scoreboard.teamA.balls = 0;
      this.teamOvers.teamAOvers.currentBall = 0;
      this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
    }
    if (this.teamBBat) {
      if(this.currentMatch.teams.teamB.bat_bowl_first === 'bowl')
        {
          let displayMessage = "";
          const runs = (this.currentMatch.scoreboard.teamA.runs + 1) - this.currentMatch.scoreboard.teamB.runs;
            if(runs <= 0)
            {
              this.currentMatch.matchStatus.status = 'end';
              const name = this.currentMatch.teams.teamB.name;
              this.currentMatch.matchStatus.whoWon = name;
              let count = 0;
              this.currentMatch.teams.teamB.players.forEach(p => {
                  if(!p.isWicket)
                     count++;
              })
              if(count > 1){
              this.currentMatch.matchStatus.wonBy = count+" wickets";
              displayMessage = "Team "+name+" has won the Match by "+count+" wickets";
              }
              else{
              this.currentMatch.matchStatus.wonBy = 1+" wicket";
              displayMessage = "Team "+name+" has won the Match by "+1+" wicket";
              }
              this.endLoading(displayMessage);
              finishMatch = true;
            }    
        }
      this.teamOvers.teamBOvers.currentOver++;
      this.scoreboard.teamB.overs = this.teamOvers.teamBOvers.currentOver;
      this.scoreboard.teamB.balls = 0;
      this.teamOvers.teamBOvers.currentBall = 0;
      this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => { })
    }
    return finishMatch;
  }

  afterSixBalls(ifLastBall: boolean) {
    const check = this.onOverCompleted(); // doing changes for over completion
    if(!check)
    {
    if (this.teamABat && this.teamOvers.teamAOvers.currentOver === this.teamOvers.oversCount) 
        this.onSwtich(false)
    else if(this.teamBBat && this.teamOvers.teamBOvers.currentOver === this.teamOvers.oversCount)
          this.onSwtich(false)
   else {
     if (ifLastBall)  // if wicket on last ball then first select new batsman then select bowler
      this.presnetActionSheetForBatsmanSelectionAfterWicket(ifLastBall,false);
    else {
      this.toastCtrl.create({
        message: 'Over Completed!!',
        color: 'dark',
        position: 'bottom',
        duration: 2000
      }).then(toast => {
        toast.present();
        toast.onDidDismiss().then(() => {
          this.presnetActionSheetForOver();
        })
      })
      }
    }
    }
  }

  async presentPopover() {
    const popover = await this.popoverController.create({
      component: ScoreboardMenuComponent,
      cssClass: 'my-custom-class',
      // event: ev,
      translucent: true,
      animated: true
    });
    // this.currentPopover = popover;
    await popover.present();

    const { role,data } = await popover.onDidDismiss();
    console.log('onDidDismiss resolved with role', role,data);
    if(role !== 'backdrop')
    {
        switch(data.value)
        {
          case 'sb':
            this.presnetActionSheetForBatsmanSelectionAfterSwitch();
            break;
          case 'cb':
            this.presnetActionSheetForOver();
            break;
            case 'db':
              this.presnetActionSheetForBatsmanSelectionAfterWicket(false,true);
              break;  
        }
    }
  }
  finishMatch()
  {
    this.router.navigateByUrl('/home');
  }
  restartMatch()
  {
    this.router.navigateByUrl('/rematch-selection');
    this.displayMessage = "";
  }
  onSwtich(ifWickets : boolean)
  {
    let message = '';
    let displayMessage = '';
    if(this.currentMatch.teams.teamA.bat_bowl_first === 'bat' && this.currentMatch.teams.teamA.currentStatus === 'bowl')
     {  const runs = this.currentMatch.scoreboard.teamA.runs - this.currentMatch.scoreboard.teamB.runs;
        this.currentMatch.matchStatus.status = 'end';
        if(runs === 0){
          this.currentMatch.matchStatus.whoWon = "NA";
          this.currentMatch.matchStatus.wonBy = "NA";
          displayMessage = "It's a Tie!!";
        }
        else{
        const name = this.currentMatch.teams.teamA.name;
        this.currentMatch.matchStatus.whoWon = name;
        this.currentMatch.matchStatus.wonBy = runs+" runs";
        displayMessage = "Team "+name+" has won the Match by "+runs+" runs";
        }
        this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => {
          this.endLoading(displayMessage);
        })
     }
    else if(this.currentMatch.teams.teamB.bat_bowl_first === 'bat' && this.currentMatch.teams.teamB.currentStatus === 'bowl')
    {
      const runs = this.currentMatch.scoreboard.teamB.runs - this.currentMatch.scoreboard.teamA.runs;
      this.currentMatch.matchStatus.status = 'end';
      if(runs === 0){
        this.currentMatch.matchStatus.whoWon = "NA";
        this.currentMatch.matchStatus.wonBy = "NA";
        displayMessage = "It's a Tie!!";
      }
        else{
        const name = this.currentMatch.teams.teamB.name;
        this.currentMatch.matchStatus.whoWon = name;
        this.currentMatch.matchStatus.wonBy = runs+" runs";
          displayMessage = "Team "+name+" has won the Match by "+runs+" runs";
        }
        this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe(() => {
          this.endLoading(displayMessage);
        })
    }
    else
    {
    if(ifWickets)
        message = 'All Out!!,Switching sides...'
    else
        message = 'All Overs Done,Switching sides...'
    
    this.loadingCtrl.create({
      message: message
    }).then(loader => {
      loader.present();
   
    setTimeout(()=> {
      loader.dismiss();
    },3500)
   
      loader.onDidDismiss().then(() => {
        this.modalCtrl.create({
          component: SwitchDisplayComponent,
          componentProps: {teams : {battingTeam : this.bowlingTeam.players,bowlingTeam : this.battingTeam.players},match : this.currentMatch}
        }).then(modal => {
          modal.present();
          return modal.onDidDismiss();
        })
      })
    })
    }
  }
  endLoading(dm : string)
  {
    this.loadingCtrl.create({
      message: "please wait..."
    }).then(loader => {
      loader.present();
   
    setTimeout(()=> {
      loader.dismiss();
    },3500)
    loader.onDidDismiss().then(() => {
      this.displayMessage = dm;
    })
    })
  }
  ngOnDestroy() {
    if (this.matchSub)
      this.matchSub.unsubscribe();
  }
  /*async presentAlertRadio() {
    const alert = await this.alertController.create({
      header: 'Radio',
      inputs: [
        {
          name: 'radio1',
          type: 'radio',
          label: 'Radio 1',
          value: 'value1',
          checked: true
        },
        {
          name: 'radio2',
          type: 'radio',
          label: 'Radio 2',
          value: 'value2'
        },
        {
          name: 'radio3',
          type: 'radio',
          label: 'Radio 3',
          value: 'value3'
        },
        {
          name: 'radio4',
          type: 'radio',
          label: 'Radio 4',
          value: 'value4'
        },
        {
          name: 'radio5',
          type: 'radio',
          label: 'Radio 5',
          value: 'value5'
        },
        {
          name: 'radio6',
          type: 'radio',
          label: 'Radio 6 Radio 6 Radio 6 Radio 6 Radio 6 Radio 6 Radio 6 Radio 6 Radio 6 Radio 6 ',
          value: 'value6'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: () => {
            console.log('Confirm Ok');
          }
        }
      ]
    });

    await alert.present();
  }*/

}
