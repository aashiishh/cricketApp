import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RematchSelectionPage } from './rematch-selection.page';

const routes: Routes = [
  {
    path: '',
    component: RematchSelectionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RematchSelectionPageRoutingModule {}
