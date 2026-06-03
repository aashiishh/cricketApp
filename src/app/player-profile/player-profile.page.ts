import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription, forkJoin } from 'rxjs';
import { ApiServiceService } from '../api-service.service';
import { AuthService } from '../auth/auth.service';
import { Ball } from '../models/ball';
import { Match } from '../models/match';
import { Player } from '../models/players';

interface PlayerMatchRecord {
  id: string;
  dateKey: string;
  dateLabel: string;
  opponent: string;
  result: string;
  runs: number;
  wickets: number;
  catches: number;
  fours: number;
  sixes: number;
  ballsFaced: number;
  ballsBowled: number;
  teamName: string;
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  matchCount: number;
}

interface PlayerProfileStats {
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  abandoned: number;
  live: number;
  totalRuns: number;
  totalWickets: number;
  totalCatches: number;
  totalFours: number;
  totalSixes: number;
  totalBallsFaced: number;
  totalBallsBowled: number;
  mostRuns: number;
  mostWickets: number;
  mostCatches: number;
  mostFours: number;
  mostSixes: number;
  battingAverage: string;
  strikeRate: string;
  wicketsPerMatch: string;
}

@Component({
  selector: 'app-player-profile',
  templateUrl: './player-profile.page.html',
  styleUrls: ['./player-profile.page.scss'],
  standalone: false
})
export class PlayerProfilePage implements OnInit, OnDestroy {
  players: Player[] = [];
  matches: Match[] = [];
  selectedPlayer: Player;
  selectedPlayerId = '';
  searchTerm = '';
  records: PlayerMatchRecord[] = [];
  calendarDays: CalendarDay[] = [];
  calendarWeeks: CalendarDay[][] = [];
  selectedDateKey = '';
  calendarMonth: Date = new Date();
  stats: PlayerProfileStats = this.emptyStats();
  isLoading = false;
  private routeSub: Subscription;

  constructor(
    private apiService: ApiServiceService,
    private authService: AuthService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe(params => {
      this.selectedPlayerId = params.get('playerId') ?? '';
      this.loadProfile();
    });
  }

  private emptyStats(): PlayerProfileStats {
    return {
      matches: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      abandoned: 0,
      live: 0,
      totalRuns: 0,
      totalWickets: 0,
      totalCatches: 0,
      totalFours: 0,
      totalSixes: 0,
      totalBallsFaced: 0,
      totalBallsBowled: 0,
      mostRuns: 0,
      mostWickets: 0,
      mostCatches: 0,
      mostFours: 0,
      mostSixes: 0,
      battingAverage: '0.00',
      strikeRate: '0.00',
      wicketsPerMatch: '0.00'
    };
  }

  private loadProfile() {
    this.isLoading = true;
    this.loadingCtrl.create({
      message: 'Loading player records...'
    }).then(loader => {
      loader.present();
      forkJoin({
        players: this.apiService.fetchPlayersList(),
        matches: this.apiService.fetchAllMatchesList()
      }).subscribe(({ players, matches }) => {
        loader.dismiss();
        this.isLoading = false;
        this.players = players;
        this.matches = matches;
        this.selectedPlayer = this.findSelectedPlayer();
        this.selectedPlayerId = this.selectedPlayer?.id ?? '';
        this.calculateProfile();
      }, () => {
        loader.dismiss();
        this.isLoading = false;
        this.toastCtrl.create({
          message: 'Unable to load player profile.',
          color: 'danger',
          position: 'bottom',
          duration: 2500
        }).then(toast => toast.present());
      });
    });
  }

  private findSelectedPlayer() {
    if (!this.selectedPlayerId) {
      return undefined;
    }
    return this.players.find(player => player.id === this.selectedPlayerId);
  }

  get canDeleteSelectedPlayer() {
    return this.authService.canManagePlayers || this.authService.currentUser?.playerId === this.selectedPlayer?.id;
  }

  get canManagePlayers() {
    return this.authService.canManagePlayers;
  }

  onPlayerChange(playerId: string) {
    this.router.navigate(['/player-profile', playerId]);
  }

  get filteredPlayers() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.players.slice(0, 20);
    }
    return this.players.filter(player => {
      return [
        player.id,
        player.userId,
        player.name,
        player.description
      ].some(value => String(value ?? '').toLowerCase().includes(term));
    }).slice(0, 30);
  }

  viewPlayer(player: Player) {
    this.router.navigate(['/player-profile', player.id]);
  }

  async confirmDeletePlayer() {
    if (!this.selectedPlayer) {
      return;
    }
    if (!this.canDeleteSelectedPlayer) {
      this.toastCtrl.create({
        message: 'You can delete only your own player profile.',
        color: 'warning',
        position: 'bottom',
        duration: 2500
      }).then(toast => toast.present());
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Delete player profile?',
      message: 'This removes '+this.selectedPlayer.name+' from the player list. Existing match scorecards will stay unchanged.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteSelectedPlayer();
          }
        }
      ]
    });
    await alert.present();
  }

  private deleteSelectedPlayer() {
    const player = this.selectedPlayer;
    if (!player?.id) {
      return;
    }
    const isOwnProfile = this.authService.currentUser?.playerId === player.id || player.userId === this.authService.currentUser?.uid;
    this.loadingCtrl.create({
      message: 'Deleting player...'
    }).then(loader => {
      loader.present();
      this.apiService.deletePlayer(player.id).subscribe(() => {
        this.players = this.players.filter(existingPlayer => existingPlayer.id !== player.id);
        const finishDelete = () => {
          loader.dismiss();
          this.toastCtrl.create({
            message: player.name+' deleted.',
            color: 'dark',
            position: 'bottom',
            duration: 2000
          }).then(toast => toast.present());

          if (isOwnProfile) {
            this.router.navigate(['/set-player-profile']);
            return;
          }

          const nextPlayer = this.players[0];
          if (nextPlayer) {
            this.router.navigate(['/player-profile', nextPlayer.id]);
          } else {
            this.selectedPlayer = undefined;
            this.selectedPlayerId = '';
            this.records = [];
            this.stats = this.emptyStats();
            this.router.navigate(['/player-profile']);
          }
        };

        if (isOwnProfile) {
          this.authService.updateCurrentUserProfile({ playerId: '' }).subscribe({
            next: finishDelete,
            error: () => {
              loader.dismiss();
              this.toastCtrl.create({
                message: 'Player deleted, but your account link could not be cleared. Please sign in again.',
                color: 'warning',
                position: 'bottom',
                duration: 3500
              }).then(toast => toast.present());
              this.router.navigate(['/set-player-profile']);
            }
          });
          return;
        }

        finishDelete();
      }, () => {
        loader.dismiss();
        this.toastCtrl.create({
          message: 'Unable to delete player.',
          color: 'danger',
          position: 'bottom',
          duration: 2500
        }).then(toast => toast.present());
      });
    });
  }

  private calculateProfile() {
    this.records = [];
    this.stats = this.emptyStats();
    if (!this.selectedPlayer) {
      return;
    }

    this.matches.forEach(match => {
      const matchRecord = this.createMatchRecord(match, this.selectedPlayer);
      if (!matchRecord) {
        return;
      }
      this.records.push(matchRecord);
      this.stats.matches++;
      this.stats.totalRuns += matchRecord.runs;
      this.stats.totalWickets += matchRecord.wickets;
      this.stats.totalCatches += matchRecord.catches;
      this.stats.totalFours += matchRecord.fours;
      this.stats.totalSixes += matchRecord.sixes;
      this.stats.totalBallsFaced += matchRecord.ballsFaced;
      this.stats.totalBallsBowled += matchRecord.ballsBowled;
      this.stats.mostRuns = Math.max(this.stats.mostRuns, matchRecord.runs);
      this.stats.mostWickets = Math.max(this.stats.mostWickets, matchRecord.wickets);
      this.stats.mostCatches = Math.max(this.stats.mostCatches, matchRecord.catches);
      this.stats.mostFours = Math.max(this.stats.mostFours, matchRecord.fours);
      this.stats.mostSixes = Math.max(this.stats.mostSixes, matchRecord.sixes);
      this.addResultToTotals(matchRecord.result);
    });

    this.records.sort((a, b) => this.getDateSortValue(b.dateKey) - this.getDateSortValue(a.dateKey) || b.id.localeCompare(a.id));
    this.selectedDateKey = this.records[0]?.dateKey ?? this.getDateKey(new Date());
    this.calendarMonth = this.getDateFromKey(this.selectedDateKey);
    this.buildCalendar();
    this.stats.battingAverage = this.average(this.stats.totalRuns, this.stats.matches);
    this.stats.strikeRate = this.stats.totalBallsFaced > 0 ? ((this.stats.totalRuns / this.stats.totalBallsFaced) * 100).toFixed(2) : '0.00';
    this.stats.wicketsPerMatch = this.average(this.stats.totalWickets, this.stats.matches);
  }

  private createMatchRecord(match: Match, player: Player): PlayerMatchRecord {
    const teamAPlayer = match.teams?.teamA?.players?.find(matchPlayer => this.isSamePlayer(matchPlayer, player));
    const teamBPlayer = match.teams?.teamB?.players?.find(matchPlayer => this.isSamePlayer(matchPlayer, player));
    const matchPlayer = teamAPlayer ?? teamBPlayer;
    if (!matchPlayer) {
      return undefined;
    }

    const battingStats = this.getBoundaryStats(match, player);
    return {
      id: match.id,
      dateKey: this.extractDateKey(match.id),
      dateLabel: this.formatMatchDate(match.id),
      opponent: teamAPlayer ? match.teams.teamB.name : match.teams.teamA.name,
      result: this.getResult(match, teamAPlayer ? match.teams.teamA.name : match.teams.teamB.name),
      runs: matchPlayer.runs ?? 0,
      wickets: matchPlayer.wicketsTaken ?? 0,
      catches: battingStats.catches,
      fours: battingStats.fours,
      sixes: battingStats.sixes,
      ballsFaced: matchPlayer.ballsPlayed ?? battingStats.ballsFaced,
      ballsBowled: battingStats.ballsBowled,
      teamName: teamAPlayer ? match.teams.teamA.name : match.teams.teamB.name
    };
  }

  private isSamePlayer(matchPlayer: Player, selectedPlayer: Player) {
    return (matchPlayer.id && selectedPlayer.id && matchPlayer.id === selectedPlayer.id) || matchPlayer.name === selectedPlayer.name;
  }

  private getBoundaryStats(match: Match, player: Player) {
    const stats = { fours: 0, sixes: 0, catches: 0, ballsFaced: 0, ballsBowled: 0 };
    const balls = this.getAllBalls(match);
    balls.forEach(ball => {
      if (ball.batsman === player.name) {
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
      if (ball.baller === player.name && ball.status !== 'wide' && ball.status !== 'no') {
        stats.ballsBowled++;
      }
      if (ball.caught_by === player.name) {
        stats.catches++;
      }
    });
    return stats;
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

  private addResultToTotals(result: string) {
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

  get selectedDateRecords() {
    return this.records.filter(record => record.dateKey === this.selectedDateKey);
  }

  get selectedDateLabel() {
    return this.formatDateKey(this.selectedDateKey);
  }

  get calendarTitle() {
    return this.calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  previousMonth() {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth() {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  selectCalendarDay(day: CalendarDay) {
    this.selectedDateKey = day.dateKey;
    if (!day.inMonth) {
      this.calendarMonth = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
    }
    this.buildCalendar();
  }

  private buildCalendar() {
    const firstDay = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());
    const todayKey = this.getDateKey(new Date());
    const matchCounts = this.records.reduce((counts, record) => {
      counts[record.dateKey] = (counts[record.dateKey] ?? 0) + 1;
      return counts;
    }, {} as {[key: string]: number});

    this.calendarDays = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dateKey = this.getDateKey(date);
      return {
        date,
        dateKey,
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === this.calendarMonth.getMonth(),
        isToday: dateKey === todayKey,
        isSelected: dateKey === this.selectedDateKey,
        matchCount: matchCounts[dateKey] ?? 0
      };
    });
    this.calendarWeeks = [];
    for (let index = 0; index < this.calendarDays.length; index += 7) {
      this.calendarWeeks.push(this.calendarDays.slice(index, index + 7));
    }
  }

  private getDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return String(year) + month + day;
  }

  private getDateFromKey(dateKey: string) {
    const dateMatch = this.parseDateKey(dateKey);
    if (!dateMatch) {
      return new Date();
    }
    return new Date(dateMatch.year, dateMatch.month - 1, 1);
  }

  private getDateSortValue(dateKey: string) {
    const dateMatch = this.parseDateKey(dateKey);
    if (!dateMatch) {
      return 0;
    }
    return Number(String(dateMatch.year) + String(dateMatch.month).padStart(2, '0') + String(dateMatch.day).padStart(2, '0'));
  }

  private extractDateKey(matchId: string) {
    const dateMatch = matchId.match(/^(\d{8})_/);
    const parsedDate = dateMatch ? this.parseDateKey(dateMatch[1]) : undefined;
    return parsedDate ? this.toDateKey(parsedDate.year, parsedDate.month, parsedDate.day) : this.getDateKey(new Date());
  }

  private formatDateKey(dateKey: string) {
    const dateMatch = this.parseDateKey(dateKey);
    if (!dateMatch) {
      return dateKey;
    }
    return String(dateMatch.day).padStart(2, '0') + '/' + String(dateMatch.month).padStart(2, '0') + '/' + dateMatch.year;
  }

  private formatMatchDate(matchId: string) {
    const dateMatch = matchId.match(/^(\d{8})_/);
    const parsedDate = dateMatch ? this.parseDateKey(dateMatch[1]) : undefined;
    if (!parsedDate) {
      return matchId;
    }
    return this.formatDateKey(this.toDateKey(parsedDate.year, parsedDate.month, parsedDate.day));
  }

  private parseDateKey(dateKey: string) {
    const match = String(dateKey ?? '').match(/^(\d{8})$/);
    if (!match) {
      return undefined;
    }

    const key = match[1];
    const yyyyFirst = {
      year: Number(key.substring(0, 4)),
      month: Number(key.substring(4, 6)),
      day: Number(key.substring(6, 8))
    };
    if (this.isValidDateParts(yyyyFirst.year, yyyyFirst.month, yyyyFirst.day)) {
      return yyyyFirst;
    }

    const ddFirst = {
      day: Number(key.substring(0, 2)),
      month: Number(key.substring(2, 4)),
      year: Number(key.substring(4, 8))
    };
    return this.isValidDateParts(ddFirst.year, ddFirst.month, ddFirst.day) ? ddFirst : undefined;
  }

  private isValidDateParts(year: number, month: number, day: number) {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  private toDateKey(year: number, month: number, day: number) {
    return String(year) + String(month).padStart(2, '0') + String(day).padStart(2, '0');
  }

  getResultClass(result: string) {
    return result.toLowerCase();
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }
}
