import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-scoreboard-menu',
  templateUrl: './scoreboard-menu.component.html',
  styleUrls: ['./scoreboard-menu.component.scss'],
})
export class ScoreboardMenuComponent implements OnInit {

  constructor(public popoverController: PopoverController) { }

  ngOnInit() {}
  close(data : String)
  {
    this.popoverController.dismiss({
      value : data
    },'confirm');
      
  }

}
