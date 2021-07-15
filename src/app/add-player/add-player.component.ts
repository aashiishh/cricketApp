import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-add-player',
  templateUrl: './add-player.component.html',
  styleUrls: ['./add-player.component.scss'],
})
export class AddPlayerComponent implements OnInit {
  @ViewChild('f', {static: true}) form: NgForm;
  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {}

  onCancel()
  {
    this.modalCtrl.dismiss(null,'cancel');
  }

  onAddItem()
  {
    if(!this.form.valid)
    return;

    this.modalCtrl.dismiss({
      newPlayerData : {
        name : this.form.value['name'],
        desc : this.form.value['description']
      }
    },'confirm');
  }
}
