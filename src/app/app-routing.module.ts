import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'create-match1',
    loadChildren: () => import('./create-match1/create-match1.module').then( m => m.CreateMatch1PageModule)
  },
  {
    path: 'scoreboard',
    loadChildren: () => import('./scoreboard/scoreboard.module').then( m => m.ScoreboardPageModule)
  },
  {
    path: 'rematch-selection',
    loadChildren: () => import('./rematch-selection/rematch-selection.module').then( m => m.RematchSelectionPageModule)
  },
  {
    path: 'todays-matches',
    loadChildren: () => import('./todays-matches/todays-matches.module').then( m => m.TodaysMatchesPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
