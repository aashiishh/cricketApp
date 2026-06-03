import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, IonSelect, LoadingController, ModalController, PopoverController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { AuthService } from '../auth/auth.service';
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
    standalone: false
})
export class ScoreboardPage implements OnInit, OnDestroy {
  @ViewChild('wt', { static: false }) wicketType: IonSelect;
  loadedMatches: Match[] = [];
  displayMessage : string = '';
  currentPopover = null;
  batsman: Player = {id : '',name: ''};             // to display current batsman
  nonStriker: Player = {id : '',name: ''};
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
    teams: {
      teamA: { name: '', currentStatus: '', players: [] },
      teamB: { name: '', currentStatus: '', players: [] }
    },
    scoreboard: this.scoreboard,
    teamOvers: this.teamOvers,
    matchStatus: { status: '', whoWon: '', wonBy: '' }
  }
  isLoading: boolean = false;
  private selectedMatchId = '';
  private matchSub: Subscription;
  private undoStack: Match[] = [];
  freeHitActive = false;
  constructor(private alertController:AlertController,private modalCtrl: ModalController,private actionSheetController: ActionSheetController, private toastCtrl: ToastController, private service: ApiServiceService, private loadingCtrl: LoadingController,public popoverController: PopoverController,private router:Router,private route: ActivatedRoute,private authService: AuthService) {}

  get canManageMatches() {
    return this.authService.canManageMatches;
  }

  get canScoreMatch() {
    return this.service.canUpdateMatch(this.currentMatch);
  }

  private ensurePlayerStats(player: Player) {
    player.runs = player.runs ?? 0;
    player.ballsPlayed = player.ballsPlayed ?? 0;
    player.wicketsTaken = player.wicketsTaken ?? 0;
    player.runsGiven = player.runsGiven ?? 0;
  }

  private maxWicketsForBattingTeam() {
    return Math.max(this.battingTeam.players.length - 1, 1);
  }

  private isBattingTeamAllOut() {
    return this.battingTeam.players.length > 0 && this.getBattingScore().wickets >= this.maxWicketsForBattingTeam();
  }

  private getBattingScore() {
    return this.teamABat ? this.scoreboard.teamA : this.scoreboard.teamB;
  }

  private markCurrentBatsmanOut() {
    this.batsman.isWicket = true;
    this.batsman.onPitch = false;
    this.batsman.isStriker = false;
    this.battingTeam.players.forEach(player => {
      if (player.name === this.batsman.name) {
        player.isWicket = true;
        player.onPitch = false;
        player.isStriker = false;
      }
    });
  }

  private markBatsmanOut(player: Player) {
    player.isWicket = true;
    player.onPitch = false;
    player.isStriker = false;
    this.battingTeam.players.forEach(teamPlayer => {
      if (teamPlayer.name === player.name) {
        teamPlayer.isWicket = true;
        teamPlayer.onPitch = false;
        teamPlayer.isStriker = false;
      }
    });
  }

  private setBattersOnPitch(striker: Player, nonStriker: Player) {
    this.battingTeam.players.forEach(player => {
      if (player.name === striker.name) {
        player.onPitch = true;
        player.isWicket = false;
        player.isStriker = true;
      } else if (player.name === nonStriker.name) {
        player.onPitch = true;
        player.isWicket = false;
        player.isStriker = false;
      } else if (player.onPitch) {
        player.isStriker = false;
      }
    });
    this.batsman = striker;
    this.nonStriker = nonStriker;
  }

  private rotateStrike() {
    const striker = this.batsman;
    const nonStriker = this.nonStriker;
    if (!striker?.name || !nonStriker?.name) {
      return;
    }

    striker.isStriker = false;
    nonStriker.isStriker = true;
    this.batsman = nonStriker;
    this.nonStriker = striker;
  }

  private getWicketsWinText(team: Team) {
    const wicketsLeft = Math.max(team.players.length - this.getBattingScore().wickets, 1);
    return wicketsLeft === 1 ? '1 wicket' : wicketsLeft + ' wickets';
  }

  private setCurrentMatchFromList(matches: Match[]) {
    this.loadedMatches = matches;
    const routeMatch = this.selectedMatchId ? matches.find(match => match.id === this.selectedMatchId) : undefined;
    this.currentMatch = routeMatch ?? this.loadedMatches[this.loadedMatches.length - 1];
    if (!this.currentMatch) {
      return;
    }

    this.teamOvers = this.currentMatch.teamOvers;
    this.scoreboard = this.currentMatch.scoreboard;
    this.teamABat = false;
    this.teamBBat = false;
    this.batsman = {id : '',name: ''};
    this.nonStriker = {id : '',name: ''};
    this.bowler = {id : '',name: ''};
    if (this.currentMatch.teams.teamA.currentStatus === 'bat') {
      this.teamABat = true;
      this.battingTeam = this.currentMatch.teams.teamA;
      this.bowlingTeam = this.currentMatch.teams.teamB;
    }
    if (this.currentMatch.teams.teamB.currentStatus === 'bat') {
      this.teamBBat = true;
      this.battingTeam = this.currentMatch.teams.teamB;
      this.bowlingTeam = this.currentMatch.teams.teamA;
    }

    this.battingTeam.players.forEach(player => {
      if (player.onPitch && !player.isWicket && player.isStriker)
        this.batsman = player;
      if (player.onPitch && !player.isWicket && !player.isStriker)
        this.nonStriker = player;
    })
    if (!this.batsman.name) {
      this.batsman = this.battingTeam.players.find(player => player.onPitch && !player.isWicket) ?? this.batsman;
    }
    if (!this.nonStriker.name || this.nonStriker.name === this.batsman.name) {
      this.nonStriker = this.battingTeam.players.find(player => player.onPitch && !player.isWicket && player.name !== this.batsman.name) ?? this.nonStriker;
    }
    this.ensurePlayerStats(this.batsman);
    this.ensurePlayerStats(this.nonStriker);

    this.bowlingTeam.players.forEach(player => {
      if (player.onPitch)
        this.bowler = player;
    })
    this.ensurePlayerStats(this.bowler);
    this.freeHitActive = this.deriveFreeHitFromCurrentOver();
  }

  private deriveFreeHitFromCurrentOver() {
    const score = this.getBattingScore();
    const currentOver = this.teamABat
      ? this.teamOvers.teamAOvers?.overs?.[score.overs]
      : this.teamOvers.teamBOvers?.overs?.[score.overs];
    const balls = currentOver?.balls ?? [];
    for (let index = balls.length - 1; index >= 0; index--) {
      const ball = balls[index];
      if (!ball?.status) {
        continue;
      }
      if (ball.status === 'no') {
        return true;
      }
      if (ball.status === 'wide') {
        continue;
      }
      return false;
    }
    return false;
  }

  private showErrorToast(message: string) {
    this.toastCtrl.create({
      message,
      color: 'danger',
      position: 'bottom',
      duration: 2500
    }).then(toast => {
      toast.present();
    });
  }

  private saveCurrentMatch(onSaved?: () => void, errorMessage = 'Unable to save scorecard. Please check your connection.') {
    this.service.onUpdateBatBowlSelectionOrMatchScore(this.currentMatch).subscribe({
      next: () => {
        if (onSaved) {
          onSaved();
        }
      },
      error: error => {
        this.showErrorToast(error?.message || errorMessage);
      }
    });
  }

  private finishChaseIfWon(): boolean {
    if (this.teamABat && this.currentMatch.teams.teamA.bat_bowl_first === 'bowl') {
      const runsRequired = (this.currentMatch.scoreboard.teamB.runs + 1) - this.currentMatch.scoreboard.teamA.runs;
      if (runsRequired <= 0) {
        const name = this.currentMatch.teams.teamA.name;
        this.currentMatch.matchStatus.status = 'end';
        this.currentMatch.matchStatus.whoWon = name;
        this.currentMatch.matchStatus.wonBy = this.getWicketsWinText(this.currentMatch.teams.teamA);
        this.saveCurrentMatch(() => this.endLoading("Team "+name+" has won the Match by "+this.currentMatch.matchStatus.wonBy));
        return true;
      }
    }
    if (this.teamBBat && this.currentMatch.teams.teamB.bat_bowl_first === 'bowl') {
      const runsRequired = (this.currentMatch.scoreboard.teamA.runs + 1) - this.currentMatch.scoreboard.teamB.runs;
      if (runsRequired <= 0) {
        const name = this.currentMatch.teams.teamB.name;
        this.currentMatch.matchStatus.status = 'end';
        this.currentMatch.matchStatus.whoWon = name;
        this.currentMatch.matchStatus.wonBy = this.getWicketsWinText(this.currentMatch.teams.teamB);
        this.saveCurrentMatch(() => this.endLoading("Team "+name+" has won the Match by "+this.currentMatch.matchStatus.wonBy));
        return true;
      }
    }
    return false;
  }

  private saveUndoSnapshot() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.currentMatch)));
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }
  }

  private restoreMatch(match: Match) {
    this.currentMatch = match;
    const index = this.loadedMatches.findIndex(existingMatch => existingMatch.id === match.id);
    if (index > -1) {
      this.loadedMatches[index] = match;
    }
    this.setCurrentMatchFromList(this.loadedMatches);
  }

  undoLastBall() {
    const previousMatch = this.undoStack.pop();
    if (!previousMatch) {
      this.showErrorToast('Nothing to undo.');
      return;
    }
    this.restoreMatch(previousMatch);
    this.saveCurrentMatch(() => {
      this.toastCtrl.create({
        message: 'Last ball undone.',
        color: 'dark',
        position: 'bottom',
        duration: 1500
      }).then(toast => {
        toast.present();
      });
    });
  }

  ngOnInit() {
    this.selectedMatchId = this.route.snapshot.paramMap.get('matchId') ?? '';
    this.matchSub = this.service.todaysMatches.subscribe(matches => {
      if (matches && matches.length > 0) {
        this.setCurrentMatchFromList(matches);
      }
    })

  }
  ionViewWillEnter() {
    this.isLoading = true;
    this.loadingCtrl.create({
      message: 'setting up scoreboard...'
    }).then(loader => {
      loader.present();
      if (this.selectedMatchId) {
        this.service.getMatch(this.selectedMatchId).subscribe(match => {
          this.setCurrentMatchFromList([match]);
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
        }, () => {
          loader.dismiss();
          this.isLoading = false;
          this.showErrorToast('Unable to load match. Please check your connection.');
        });
        return;
      }

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
      }, () => {
        loader.dismiss();
        this.isLoading = false;
        this.showErrorToast('Unable to load match. Please check your connection.');
      });
    })
  }

  private addBallToCurrentOver(ball: Ball) {
    if (this.teamABat) {
      if(this.teamOvers.teamAOvers.currentBall === 0)
        this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls[0] = ball;
      else
        this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls.push(ball);
      this.teamOvers.teamAOvers.currentBall++;
    }
    if (this.teamBBat) {
      if(this.teamOvers.teamBOvers.currentBall === 0)
        this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls[0] = ball;
      else
        this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls.push(ball);
      this.teamOvers.teamBOvers.currentBall++;
    }
  }

  private recordDelivery(options: {
    totalRuns: number,
    batterRuns: number,
    bowlerRuns: number,
    completedRuns: number,
    legalDelivery: boolean,
    status: string,
    display: string,
    freeHit?: boolean
  }) {
    this.saveUndoSnapshot();
    this.ensurePlayerStats(this.batsman);
    this.ensurePlayerStats(this.bowler);
    const ball: Ball = {
      baller: this.bowler.name,
      batsman: this.batsman.name,
      run: options.totalRuns+'',
      status: options.status,
      display: options.display,
      batsman_runs: options.batterRuns+'',
      extra_runs: (options.totalRuns - options.batterRuns)+'',
      free_hit: options.freeHit
    }

    const score = this.getBattingScore();
    score.runs = score.runs + options.totalRuns;
    this.bowler.runsGiven += options.bowlerRuns;
    this.batsman.runs += options.batterRuns;

    if (options.legalDelivery) {
      score.balls++;
      this.batsman.ballsPlayed++;
    }

    this.addBallToCurrentOver(ball);
    if (options.legalDelivery && this.freeHitActive) {
      this.freeHitActive = false;
    }
    if (this.finishChaseIfWon()) {
      return;
    }
    if (options.completedRuns % 2 === 1) {
      this.rotateStrike();
    }
    if (options.legalDelivery && score.balls === 6) {
      this.afterSixBalls(false);
    } else {
      this.saveCurrentMatch();
    }
  }

  onBallDone(runs: number, status: string) {
    const isLegalDelivery = status === 'runs' || status === 'dot' || status === 'bye' || status === 'legbye';
    const batterRuns = status === 'runs' ? runs : 0;
    const bowlerRuns = status === 'bye' || status === 'legbye' ? 0 : runs;
    const display = status === 'bye' ? 'B'+runs : status === 'legbye' ? 'LB'+runs : status === 'wide' ? 'Wd' : status === 'no' ? 'NB' : runs+'';
    this.recordDelivery({
      totalRuns: runs,
      batterRuns,
      bowlerRuns,
      completedRuns: runs,
      legalDelivery: isLegalDelivery,
      status,
      display,
      freeHit: this.freeHitActive
    });
  }

  onWide(extraRuns: number) {
    this.recordDelivery({
      totalRuns: 1 + extraRuns,
      batterRuns: 0,
      bowlerRuns: 1 + extraRuns,
      completedRuns: extraRuns,
      legalDelivery: false,
      status: 'wide',
      display: extraRuns > 0 ? 'Wd+'+extraRuns : 'Wd',
      freeHit: this.freeHitActive
    });
  }

  onNoBall(batterRuns: number) {
    this.recordDelivery({
      totalRuns: 1 + batterRuns,
      batterRuns,
      bowlerRuns: 1 + batterRuns,
      completedRuns: batterRuns,
      legalDelivery: false,
      status: 'no',
      display: batterRuns > 0 ? 'NB+'+batterRuns : 'NB',
      freeHit: this.freeHitActive
    });
    this.freeHitActive = true;
    this.toastCtrl.create({
      message: 'Free hit on the next legal delivery.',
      color: 'warning',
      position: 'bottom',
      duration: 1800
    }).then(toast => {
      toast.present();
    });
  }

  async presentExtrasSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Extras',
      cssClass: 'my-custom-class',
      buttons: [
        {
          text: 'Wide',
          handler: () => this.onWide(0)
        },
        {
          text: 'Wide + 1 run',
          handler: () => this.onWide(1)
        },
        {
          text: 'Wide + 2 runs',
          handler: () => this.onWide(2)
        },
        {
          text: 'Wide + 3 runs',
          handler: () => this.onWide(3)
        },
        {
          text: 'Wide + 4 runs',
          handler: () => this.onWide(4)
        },
        {
          text: 'No Ball',
          handler: () => this.onNoBall(0)
        },
        {
          text: 'No Ball + 1 bat run',
          handler: () => this.onNoBall(1)
        },
        {
          text: 'No Ball + 2 bat runs',
          handler: () => this.onNoBall(2)
        },
        {
          text: 'No Ball + 3 bat runs',
          handler: () => this.onNoBall(3)
        },
        {
          text: 'No Ball + 4 bat runs',
          handler: () => this.onNoBall(4)
        },
        {
          text: 'No Ball + 6 bat runs',
          handler: () => this.onNoBall(6)
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  onWicket(value: string) {
    if (value) {
      if (this.freeHitActive && !['r', 'retired'].includes(value)) {
        this.toastCtrl.create({
          message: 'Free hit: only run out is allowed from these wicket options.',
          color: 'warning',
          position: 'bottom',
          duration: 2200
        }).then(toast => {
          toast.present();
        });
        return;
      }
      this.ensurePlayerStats(this.batsman);
      this.ensurePlayerStats(this.bowler);
      this.toastCtrl.create({
        message: 'Its a Wicket!!',
        color: 'danger',
        position: 'bottom',
        duration: 1500
      }).then(toast => {
        toast.present();
        return toast.onDidDismiss();
      }).then(() => {

        if (value === 'b' || value === 's' || value === 'lbw' || value === 'hw')
          this.onBowled(value);
        else if (value === 'r')
          this.onRunOut();
        else if (value === 'retired')
          this.applyStrikerWicket('retired out', 'RET', false, false);
        else if (value)
          this.presentActionSheet();
      });
      if (this.wicketType) {
        this.wicketType.value = "";
      }
    }
  }
  onBowled(status: string) {
    const wicketMap: {[key: string]: { type: string; display: string }} = {
      b: { type: 'bowled', display: 'B' },
      s: { type: 'stumped', display: 'ST' },
      lbw: { type: 'lbw', display: 'LBW' },
      hw: { type: 'hit wicket', display: 'HW' }
    };
    const wicket = wicketMap[status] ?? wicketMap.b;
    this.applyStrikerWicket(wicket.type, wicket.display, true, true);
  }

  private applyStrikerWicket(wicketType: string, display: string, creditBowler: boolean, legalDelivery: boolean) {
    this.saveUndoSnapshot();
    const ball: Ball = {
      baller: this.bowler.name,
      batsman: this.batsman.name,
      run: '0',
      status: 'wicket',
      display,
      wicket_type: wicketType,
      dismissed_batsman: this.batsman.name,
      free_hit: this.freeHitActive
    }

    if (creditBowler) {
      this.bowler.wicketsTaken++;
    }
    if (this.teamABat) {

      this.scoreboard.teamA.wickets += 1;
      if (legalDelivery) {
        this.scoreboard.teamA.balls += 1;
        this.batsman.ballsPlayed++;
      }
      this.markCurrentBatsmanOut();
      if(this.teamOvers.teamAOvers.currentBall === 0)
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls.push(ball);
      this.teamOvers.teamAOvers.currentBall++;

      if (legalDelivery && this.freeHitActive) {
        this.freeHitActive = false;
      }
      if (legalDelivery && this.scoreboard.teamA.balls === 6)
        this.afterSixBalls(true); //wicket on last ball of over
      else {
        this.saveCurrentMatch();
        this.presnetActionSheetForBatsmanSelectionAfterWicket(false,false); //wicket not on last ball of over
      }
    }
    if (this.teamBBat) {
      this.scoreboard.teamB.wickets += 1;
      if (legalDelivery) {
        this.scoreboard.teamB.balls += 1;
        this.batsman.ballsPlayed++;
      }
      this.markCurrentBatsmanOut();
      if(this.teamOvers.teamBOvers.currentBall === 0)
      this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls.push(ball);
      this.teamOvers.teamBOvers.currentBall++;
      if (legalDelivery && this.freeHitActive) {
        this.freeHitActive = false;
      }
      if (legalDelivery && this.scoreboard.teamB.balls === 6)
        this.afterSixBalls(true); //wicket on last ball of over
      else {
        this.saveCurrentMatch();
      this.presnetActionSheetForBatsmanSelectionAfterWicket(false,false); //wicket not on last ball of over
      }
    }
  }
  async onRunOut() {
    const alert = await this.alertController.create({
      header: 'Run out',
      message: 'Enter completed runs, then choose who was dismissed.',
      backdropDismiss: false,
      inputs: [
        {
          name: 'completedRuns',
          type: 'number',
          placeholder: 'Completed runs',
          min: 0,
          max: 6,
          value: 0
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: this.batsman.name + ' out',
          handler: data => {
            const completedRuns = Number(data?.completedRuns ?? 0);
            if (Number.isNaN(completedRuns) || completedRuns < 0 || completedRuns > 6) {
              this.showErrorToast('Enter completed runs from 0 to 6.');
              return false;
            }
            this.applyRunOut(this.batsman.name, completedRuns);
            return true;
          }
        },
        {
          text: this.nonStriker.name + ' out',
          handler: data => {
            const completedRuns = Number(data?.completedRuns ?? 0);
            if (Number.isNaN(completedRuns) || completedRuns < 0 || completedRuns > 6) {
              this.showErrorToast('Enter completed runs from 0 to 6.');
              return false;
            }
            this.applyRunOut(this.nonStriker.name, completedRuns);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private applyRunOut(dismissedBatsmanName: string, completedRuns: number) {
    this.saveUndoSnapshot();
    this.ensurePlayerStats(this.batsman);
    const dismissedPlayer = dismissedBatsmanName === this.nonStriker.name ? this.nonStriker : this.batsman;
    const originalStriker = this.batsman;
    const originalNonStriker = this.nonStriker;
    const crossed = completedRuns % 2 === 1;
    const ball: Ball = {
      baller: this.bowler.name,
      batsman: this.batsman.name,
      run: completedRuns+'',
      status: 'wicket',
      display: completedRuns > 0 ? 'RO+'+completedRuns : 'RO',
      batsman_runs: completedRuns+'',
      extra_runs: '0',
      wicket_type: 'run out',
      dismissed_batsman: dismissedPlayer.name,
      free_hit: this.freeHitActive
    }

    const score = this.getBattingScore();
    score.wickets += 1;
    score.runs += completedRuns;
    score.balls += 1;
    originalStriker.runs += completedRuns;
    originalStriker.ballsPlayed++;
    this.addBallToCurrentOver(ball);
    if (this.freeHitActive) {
      this.freeHitActive = false;
    }
    this.markBatsmanOut(dismissedPlayer);

    const strikerAfterRuns = crossed ? originalNonStriker : originalStriker;
    const nonStrikerAfterRuns = crossed ? originalStriker : originalNonStriker;
    const replacementIsStriker = dismissedPlayer.name === strikerAfterRuns.name;
    const activeStriker = replacementIsStriker ? nonStrikerAfterRuns : strikerAfterRuns;
    const activeNonStriker = replacementIsStriker ? strikerAfterRuns : nonStrikerAfterRuns;
    const lastBallOfOver = score.balls === 6;

    if (this.isBattingTeamAllOut()) {
      this.saveCurrentMatch();
      this.onSwtich(true);
      return;
    }
    this.presentRunOutReplacementSelection(lastBallOfOver, replacementIsStriker, activeStriker, activeNonStriker);
  }

  private async presentRunOutReplacementSelection(ifLastBall: boolean, replacementIsStriker: boolean, activeStriker: Player, activeNonStriker: Player) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Select next Batsman',
      cssClass: 'my-custom-class',
      buttons: this.createButtonsForRunOutReplacement(ifLastBall, replacementIsStriker, activeStriker, activeNonStriker)
    });
    await actionSheet.present();
  }

  private createButtonsForRunOutReplacement(ifLastBall: boolean, replacementIsStriker: boolean, activeStriker: Player, activeNonStriker: Player) {
    const buttons = [];
    for (var index in this.battingTeam.players) {
      const player = this.battingTeam.players[index];
      if (!player.onPitch && !player.isWicket) {
        buttons.push({
          text: player.name,
          handler: () => {
            const striker = replacementIsStriker ? player : activeStriker;
            const nonStriker = replacementIsStriker ? activeNonStriker : player;
            this.setBattersOnPitch(striker, nonStriker);
            this.completeRunOutAfterReplacement(ifLastBall);
          }
        });
      }
    }
    return buttons;
  }

  private completeRunOutAfterReplacement(ifLastBall: boolean) {
    if (!ifLastBall) {
      this.saveCurrentMatch();
      return;
    }

    const finished = this.onOverCompleted();
    if (finished) {
      return;
    }
    if (this.teamABat && this.teamOvers.teamAOvers.currentOver === this.teamOvers.oversCount) {
      this.onSwtich(false);
      return;
    }
    if (this.teamBBat && this.teamOvers.teamBOvers.currentOver === this.teamOvers.oversCount) {
      this.onSwtich(false);
      return;
    }
    this.rotateStrike();
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

  ondidCatch(caughtBy: string) {
    this.saveUndoSnapshot();
    const ball: Ball = {
      baller: this.bowler.name,
      batsman: this.batsman.name,
      run: '0',
      status: 'wicket',
      wicket_type: caughtBy === this.bowler.name ? 'caught and bowled' : 'caught',
      caught_by: caughtBy
    }


    this.bowler.wicketsTaken++;
    if (this.teamABat) {
      this.scoreboard.teamA.wickets += 1;
      this.scoreboard.teamA.balls += 1;
      this.batsman.ballsPlayed++;
      this.markCurrentBatsmanOut();
      if(this.teamOvers.teamAOvers.currentBall === 0)
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamAOvers.overs[this.teamOvers.teamAOvers.currentOver].balls.push(ball);
      this.teamOvers.teamAOvers.currentBall++;
      if (this.scoreboard.teamA.balls === 6)
        this.afterSixBalls(true);  //true as over and wicket both happend
      else {
        this.saveCurrentMatch();
        this.presnetActionSheetForBatsmanSelectionAfterWicket(false,false); //only wicket not over completed  then sending false
      }
    }
    if (this.teamBBat) {
      this.scoreboard.teamB.wickets += 1;
      this.scoreboard.teamB.balls += 1;
      this.batsman.ballsPlayed++;
      this.markCurrentBatsmanOut();
      if(this.teamOvers.teamBOvers.currentBall === 0)
      this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls[0] = ball;
      else
      this.teamOvers.teamBOvers.overs[this.teamOvers.teamBOvers.currentOver].balls.push(ball);
      this.teamOvers.teamBOvers.currentBall++;
      if (this.scoreboard.teamB.balls === 6)
        this.afterSixBalls(true); //wicket on last ball of over
      else {
        this.saveCurrentMatch();
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
            this.saveCurrentMatch();
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
            this.saveCurrentMatch();
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
                  p.isStriker = true;
                }
                if (this.batsman.name === p.name) {  // setting current Batsman as out
                  p.onPitch = false;
                  p.isWicket = true;
                  p.isStriker = false;
                }
                if (p.onPitch && p.name !== player.name) {
                  p.isStriker = false;
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
                  p.isStriker = true;
                }
                if (this.batsman.name === p.name) {
                  p.onPitch = false;
                  p.isWicket = true;
                  p.isStriker = false;

                }
                if (p.onPitch && p.name !== player.name) {
                  p.isStriker = false;
                }
              })
              if(isDismiss){
               this.scoreboard.teamB.wickets++;
              }
            }
            this.batsman = player;
            this.nonStriker = this.battingTeam.players.find(p => p.onPitch && !p.isWicket && p.name !== this.batsman.name) ?? this.nonStriker;
            this.saveCurrentMatch();
            if (ifLastBall) {
              this.rotateStrike();
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
        if(this.isBattingTeamAllOut())
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
      if(this.isBattingTeamAllOut())
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
            this.currentMatch.matchStatus.wonBy = this.getWicketsWinText(this.currentMatch.teams.teamA);
            displayMessage = "Team "+name+" has won the Match by "+this.currentMatch.matchStatus.wonBy;
            this.saveCurrentMatch(() => this.endLoading(displayMessage));
            finishMatch = true;
            return finishMatch;
          }
      }
      this.teamOvers.teamAOvers.currentOver++;
      this.scoreboard.teamA.overs = this.teamOvers.teamAOvers.currentOver;
      this.scoreboard.teamA.balls = 0;
      this.teamOvers.teamAOvers.currentBall = 0;
      this.saveCurrentMatch();
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
              this.currentMatch.matchStatus.wonBy = this.getWicketsWinText(this.currentMatch.teams.teamB);
              displayMessage = "Team "+name+" has won the Match by "+this.currentMatch.matchStatus.wonBy;
              this.saveCurrentMatch(() => this.endLoading(displayMessage));
              finishMatch = true;
              return finishMatch;
            }
        }
      this.teamOvers.teamBOvers.currentOver++;
      this.scoreboard.teamB.overs = this.teamOvers.teamBOvers.currentOver;
      this.scoreboard.teamB.balls = 0;
      this.teamOvers.teamBOvers.currentBall = 0;
      this.saveCurrentMatch();
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
      this.rotateStrike();
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
      componentProps: {
        canManageMatches: this.canManageMatches,
        canScoreMatch: this.canScoreMatch
      },
      cssClass: 'my-custom-class',
      // event: ev,
      translucent: true,
      animated: true
    });
    // this.currentPopover = popover;
    await popover.present();

    const { role,data } = await popover.onDidDismiss();
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
            case 'undo':
              this.undoLastBall();
              break;
            case 'db':
              this.presnetActionSheetForBatsmanSelectionAfterWicket(false,true);
              break;
            case 'abandon':
              this.confirmAbandonMatch();
              break;
        }
    }
  }
  async confirmAbandonMatch() {
    if (!this.canManageMatches) {
      this.showErrorToast('Only Admin can abandon a match.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Abandon match?',
      message: 'This will end the live match and save its status as abandoned by admin.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Abandon',
          role: 'destructive',
          handler: () => {
            this.abandonMatch();
          }
        }
      ]
    });
    await alert.present();
  }
  abandonMatch() {
    this.currentMatch.matchStatus.status = 'abandoned';
    this.currentMatch.matchStatus.whoWon = 'NA';
    this.currentMatch.matchStatus.wonBy = 'Abandoned by admin';
    this.saveCurrentMatch(() => {
      this.displayMessage = 'Match abandoned by admin.';
      this.toastCtrl.create({
        message: 'Match abandoned by admin.',
        color: 'warning',
        position: 'bottom',
        duration: 2000
      }).then(toast => {
        toast.present();
      });
    }, 'Unable to abandon match.');
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
        this.saveCurrentMatch(() => this.endLoading(displayMessage));
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
        this.saveCurrentMatch(() => this.endLoading(displayMessage));
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
          componentProps: {teams : {battingTeam : this.bowlingTeam.players,bowlingTeam : this.battingTeam.players},match : this.currentMatch},
          backdropDismiss: false
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
