import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SetPlayerProfilePage } from './set-player-profile.page';

const routes: Routes = [
  {
    path: '',
    component: SetPlayerProfilePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SetPlayerProfilePageRoutingModule {}
