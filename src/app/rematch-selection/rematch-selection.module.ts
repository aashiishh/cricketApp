import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RematchSelectionPageRoutingModule } from './rematch-selection-routing.module';

import { RematchSelectionPage } from './rematch-selection.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RematchSelectionPageRoutingModule
  ],
  declarations: [RematchSelectionPage]
})
export class RematchSelectionPageModule {}
