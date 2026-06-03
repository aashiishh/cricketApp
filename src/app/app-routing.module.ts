import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then( m => m.AuthPageModule)
  },
  {
    path: 'home',
    canActivate: [AuthGuard],
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'create-match1',
    canActivate: [AuthGuard],
    loadChildren: () => import('./create-match1/create-match1.module').then( m => m.CreateMatch1PageModule)
  },
  {
    path: 'scoreboard',
    canActivate: [AuthGuard],
    loadChildren: () => import('./scoreboard/scoreboard.module').then( m => m.ScoreboardPageModule)
  },
  {
    path: 'rematch-selection',
    canActivate: [AuthGuard],
    loadChildren: () => import('./rematch-selection/rematch-selection.module').then( m => m.RematchSelectionPageModule)
  },
  {
    path: 'todays-matches',
    canActivate: [AuthGuard],
    loadChildren: () => import('./todays-matches/todays-matches.module').then( m => m.TodaysMatchesPageModule)
  },
  {
    path: 'player-profile',
    canActivate: [AuthGuard],
    loadChildren: () => import('./player-profile/player-profile.module').then( m => m.PlayerProfilePageModule)
  },
  {
    path: 'players',
    canActivate: [AuthGuard],
    loadChildren: () => import('./player-profile/player-profile.module').then( m => m.PlayerProfilePageModule)
  },
  {
    path: 'my-profile',
    canActivate: [AuthGuard],
    loadChildren: () => import('./my-profile/my-profile.module').then( m => m.MyProfilePageModule)
  },
  {
    path: 'set-player-profile',
    canActivate: [AuthGuard],
    loadChildren: () => import('./set-player-profile/set-player-profile.module').then( m => m.SetPlayerProfilePageModule)
  },
  {
    path: 'admin/users',
    canActivate: [AuthGuard],
    data: { roles: ['super-admin'] },
    loadChildren: () => import('./admin-users/admin-users.module').then( m => m.AdminUsersPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
