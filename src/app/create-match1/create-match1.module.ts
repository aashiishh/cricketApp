import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CreateMatch1PageRoutingModule } from './create-match1-routing.module';

import { CreateMatch1Page } from './create-match1.page';
import { AddPlayerComponent } from '../add-player/add-player.component';
import { BatBowlSelectionComponent } from '../bat-bowl-selection/bat-bowl-selection.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateMatch1PageRoutingModule
  ],
  declarations: [CreateMatch1Page,AddPlayerComponent,BatBowlSelectionComponent]
})
export class CreateMatch1PageModule {}
