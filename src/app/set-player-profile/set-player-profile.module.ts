import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SetPlayerProfilePageRoutingModule } from './set-player-profile-routing.module';
import { SetPlayerProfilePage } from './set-player-profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SetPlayerProfilePageRoutingModule
  ],
  declarations: [SetPlayerProfilePage]
})
export class SetPlayerProfilePageModule {}
