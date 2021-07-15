import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ScoreboardPageRoutingModule } from './scoreboard-routing.module';

import { ScoreboardPage } from './scoreboard.page';
import { ScoreboardMenuComponent } from '../scoreboard-menu/scoreboard-menu.component';
import { SwitchDisplayComponent } from '../switch-display/switch-display.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScoreboardPageRoutingModule
  ],
  declarations: [ScoreboardPage,ScoreboardMenuComponent,SwitchDisplayComponent]
})
export class ScoreboardPageModule {}
