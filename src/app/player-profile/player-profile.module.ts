import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PlayerProfilePageRoutingModule } from './player-profile-routing.module';
import { PlayerProfilePage } from './player-profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PlayerProfilePageRoutingModule
  ],
  declarations: [PlayerProfilePage]
})
export class PlayerProfilePageModule { }
