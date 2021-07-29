import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TodaysMatchesPage } from './todays-matches.page';

const routes: Routes = [
  {
    path: '',
    component: TodaysMatchesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TodaysMatchesPageRoutingModule {}
