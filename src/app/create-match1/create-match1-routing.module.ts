import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CreateMatch1Page } from './create-match1.page';

const routes: Routes = [
  {
    path: '',
    component: CreateMatch1Page
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreateMatch1PageRoutingModule {}
