import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { Player } from '../models/players';

@Component({
    selector: 'app-add-player',
    templateUrl: './add-player.component.html',
    styleUrls: ['./add-player.component.scss'],
    standalone: false
})
export class AddPlayerComponent implements OnInit {
  @ViewChild('f', {static: true}) form: NgForm;
  @Input() playerToEdit: Player;
  name = '';
  description = '';
  photoPreview = '';
  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    if (this.playerToEdit) {
      this.name = this.playerToEdit.name ?? '';
      this.description = this.playerToEdit.description ?? '';
      this.photoPreview = this.playerToEdit.imgUrl ?? '';
    }
  }

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
        name : String(this.form.value['name']).trim(),
        desc : this.form.value['description'],
        imgUrl: this.photoPreview
      }
    },'confirm');
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.resizeImage(file).then(dataUrl => {
      this.photoPreview = dataUrl;
    });
  }

  private resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 320;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const context = canvas.getContext('2d');
          if (!context) {
            reject();
            return;
          }
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = String(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
