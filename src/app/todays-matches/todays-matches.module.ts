import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TodaysMatchesPageRoutingModule } from './todays-matches-routing.module';

import { TodaysMatchesPage } from './todays-matches.page';
import { SelectionComponent } from '../selection/selection.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TodaysMatchesPageRoutingModule
  ],
  declarations: [TodaysMatchesPage,SelectionComponent]
})
export class TodaysMatchesPageModule {}
