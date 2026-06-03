import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { AuthService } from '../auth/auth.service';
import { Ball } from '../models/ball';
import { Match } from '../models/match';
import { Player } from '../models/players';

interface CareerStats {
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  abandoned: number;
  live: number;
  runs: number;
  wickets: number;
  catches: number;
  fours: number;
  sixes: number;
  ballsFaced: number;
  ballsBowled: number;
  mostRuns: number;
  mostWickets: number;
  mostCatches: number;
  mostFours: number;
  mostSixes: number;
  strikeRate: string;
  battingAverage: string;
  wicketsPerMatch: string;
}

interface MatchRecord {
  id: string;
  opponent: string;
  result: string;
  runs: number;
  wickets: number;
  catches: number;
  fours: number;
  sixes: number;
}

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.page.html',
  styleUrls: ['./my-profile.page.scss'],
  standalone: false
})
export class MyProfilePage implements OnInit {
  selectedTab: 'profile' | 'career' = 'profile';
  player: Player;
  records: MatchRecord[] = [];
  stats: CareerStats = this.emptyStats();
  isLoading = false;

  constructor(
    public authService: AuthService,
    private apiService: ApiServiceService,
    private loadingCtrl: LoadingController,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    if (!this.authService.currentUser?.playerId) {
      this.router.navigateByUrl('/set-player-profile');
      return;
    }
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading = true;
    this.loadingCtrl.create({
      message: 'Loading your career...'
    }).then(loader => {
      loader.present();
      forkJoin({
        players: this.apiService.fetchPlayersList(),
        matches: this.apiService.fetchAllMatchesList()
      }).subscribe({
        next: ({ players, matches }) => {
          loader.dismiss();
          this.isLoading = false;
          this.player = players.find(player => player.id === this.authService.currentUser?.playerId || player.userId === this.authService.currentUser?.uid);
          if (!this.player) {
            this.router.navigateByUrl('/set-player-profile');
            return;
          }
          this.calculateCareer(matches);
        },
        error: () => {
          loader.dismiss();
          this.isLoading = false;
          this.showToast('Unable to load your profile.', 'danger');
        }
      });
    });
  }

  editProfile() {
    this.router.navigateByUrl('/set-player-profile');
  }

  private calculateCareer(matches: Match[]) {
    this.records = [];
    this.stats = this.emptyStats();
    matches.forEach(match => {
      const record = this.createRecord(match);
      if (!record) {
        return;
      }
      this.records.push(record);
      this.stats.matches++;
      this.stats.runs += record.runs;
      this.stats.wickets += record.wickets;
      this.stats.catches += record.catches;
      this.stats.fours += record.fours;
      this.stats.sixes += record.sixes;
      this.stats.mostRuns = Math.max(this.stats.mostRuns, record.runs);
      this.stats.mostWickets = Math.max(this.stats.mostWickets, record.wickets);
      this.stats.mostCatches = Math.max(this.stats.mostCatches, record.catches);
      this.stats.mostFours = Math.max(this.stats.mostFours, record.fours);
      this.stats.mostSixes = Math.max(this.stats.mostSixes, record.sixes);
      this.addResult(record.result);
    });

    const boundaryStats = this.getAllBoundaryStats(matches);
    this.stats.ballsFaced = boundaryStats.ballsFaced;
    this.stats.ballsBowled = boundaryStats.ballsBowled;
    this.stats.strikeRate = this.stats.ballsFaced > 0 ? ((this.stats.runs / this.stats.ballsFaced) * 100).toFixed(2) : '0.00';
    this.stats.battingAverage = this.average(this.stats.runs, this.stats.matches);
    this.stats.wicketsPerMatch = this.average(this.stats.wickets, this.stats.matches);
  }

  private createRecord(match: Match): MatchRecord {
    const teamAPlayer = match.teams?.teamA?.players?.find(matchPlayer => this.isSamePlayer(matchPlayer));
    const teamBPlayer = match.teams?.teamB?.players?.find(matchPlayer => this.isSamePlayer(matchPlayer));
    const matchPlayer = teamAPlayer ?? teamBPlayer;
    if (!matchPlayer) {
      return undefined;
    }
    const ballStats = this.getBallStats(match);
    return {
      id: match.id,
      opponent: teamAPlayer ? match.teams.teamB.name : match.teams.teamA.name,
      result: this.getResult(match, teamAPlayer ? match.teams.teamA.name : match.teams.teamB.name),
      runs: matchPlayer.runs ?? 0,
      wickets: matchPlayer.wicketsTaken ?? 0,
      catches: ballStats.catches,
      fours: ballStats.fours,
      sixes: ballStats.sixes
    };
  }

  private isSamePlayer(matchPlayer: Player) {
    return (matchPlayer.id && this.player.id && matchPlayer.id === this.player.id) || matchPlayer.name === this.player.name;
  }

  private getBallStats(match: Match) {
    const stats = { catches: 0, fours: 0, sixes: 0, ballsFaced: 0, ballsBowled: 0 };
    this.getAllBalls(match).forEach(ball => {
      if (ball.batsman === this.player.name) {
        const batterRuns = Number(ball.batsman_runs ?? ball.run ?? 0);
        const boundaryCanCount = ball.status === 'runs' || ball.status === 'no';
        if (ball.status !== 'wide' && ball.status !== 'no') {
          stats.ballsFaced++;
        }
        if (boundaryCanCount && batterRuns === 4) {
          stats.fours++;
        }
        if (boundaryCanCount && batterRuns === 6) {
          stats.sixes++;
        }
      }
      if (ball.baller === this.player.name && ball.status !== 'wide' && ball.status !== 'no') {
        stats.ballsBowled++;
      }
      if (ball.caught_by === this.player.name) {
        stats.catches++;
      }
    });
    return stats;
  }

  private getAllBoundaryStats(matches: Match[]) {
    return matches.reduce((totals, match) => {
      const record = this.createRecord(match);
      if (!record) {
        return totals;
      }
      const stats = this.getBallStats(match);
      totals.ballsFaced += stats.ballsFaced;
      totals.ballsBowled += stats.ballsBowled;
      return totals;
    }, { ballsFaced: 0, ballsBowled: 0 });
  }

  private getAllBalls(match: Match): Ball[] {
    const balls: Ball[] = [];
    match.teamOvers?.teamAOvers?.overs?.forEach(over => balls.push(...(over.balls ?? [])));
    match.teamOvers?.teamBOvers?.overs?.forEach(over => balls.push(...(over.balls ?? [])));
    return balls;
  }

  private getResult(match: Match, teamName: string) {
    const status = match.matchStatus?.status;
    if (status === 'live') {
      return 'Live';
    }
    if (status === 'abandoned') {
      return 'Abandoned';
    }
    if (match.matchStatus?.whoWon === 'NA') {
      return 'Tie';
    }
    if (match.matchStatus?.whoWon === teamName) {
      return 'Won';
    }
    if (status === 'end') {
      return 'Lost';
    }
    return 'Played';
  }

  private addResult(result: string) {
    if (result === 'Won') {
      this.stats.wins++;
    } else if (result === 'Lost') {
      this.stats.losses++;
    } else if (result === 'Tie') {
      this.stats.ties++;
    } else if (result === 'Abandoned') {
      this.stats.abandoned++;
    } else if (result === 'Live') {
      this.stats.live++;
    }
  }

  private average(total: number, matches: number) {
    return matches > 0 ? (total / matches).toFixed(2) : '0.00';
  }

  private emptyStats(): CareerStats {
    return {
      matches: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      abandoned: 0,
      live: 0,
      runs: 0,
      wickets: 0,
      catches: 0,
      fours: 0,
      sixes: 0,
      ballsFaced: 0,
      ballsBowled: 0,
      mostRuns: 0,
      mostWickets: 0,
      mostCatches: 0,
      mostFours: 0,
      mostSixes: 0,
      strikeRate: '0.00',
      battingAverage: '0.00',
      wicketsPerMatch: '0.00'
    };
  }

  private showToast(message: string, color: string) {
    this.toastCtrl.create({
      message,
      color,
      position: 'bottom',
      duration: 2500
    }).then(toast => toast.present());
  }
}
