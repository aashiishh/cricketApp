import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { ApiServiceService } from '../api-service.service';
import { AuthService } from '../auth/auth.service';
import { Player } from '../models/players';

@Component({
  selector: 'app-set-player-profile',
  templateUrl: './set-player-profile.page.html',
  styleUrls: ['./set-player-profile.page.scss'],
  standalone: false
})
export class SetPlayerProfilePage implements OnInit {
  @ViewChild('profileForm', { static: true }) profileForm: NgForm;
  name = '';
  role = '';
  email = '';
  phone = '';
  photoPreview = '';

  constructor(
    private apiService: ApiServiceService,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const user = this.authService.currentUser;
    this.name = user?.displayName ?? '';
    this.email = user?.email ?? '';
    this.phone = user?.phone ?? '';
    this.photoPreview = user?.photoUrl ?? '';
  }

  saveProfile() {
    if (!this.profileForm.valid || !this.authService.currentUser) {
      return;
    }

    const user = this.authService.currentUser;
    const player = new Player(
      user.playerId ?? '',
      String(this.profileForm.value['name']).trim(),
      this.profileForm.value['role'] || 'Player',
      this.photoPreview,
      false,
      false,
      false,
      0,
      0,
      0,
      0,
      false,
      user.uid
    );

    this.loadingCtrl.create({
      message: 'Saving player profile...'
    }).then(loader => {
      loader.present();
      const request = user.playerId
        ? this.apiService.updatePlayer(player)
        : this.apiService.addNewPlayerToPlayersList(player);

      request.subscribe({
        next: () => {
          this.authService.updateCurrentUserProfile({
            displayName: player.name,
            email: this.profileForm.value['email'] || user.email,
            phone: this.profileForm.value['phone'] || user.phone,
            photoUrl: player.imgUrl,
            playerId: player.id
          }).subscribe({
            next: () => {
              loader.dismiss();
              this.showToast('Player profile saved.', 'success');
              this.router.navigateByUrl('/my-profile');
            },
            error: error => {
              loader.dismiss();
              this.showToast(error.message || 'Unable to link user profile.', 'danger');
            }
          });
        },
        error: () => {
          loader.dismiss();
          this.showToast('Unable to save player profile.', 'danger');
        }
      });
    });
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
          const maxSize = 360;
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

  private showToast(message: string, color: string) {
    this.toastCtrl.create({
      message,
      color,
      position: 'bottom',
      duration: 2400
    }).then(toast => toast.present());
  }
}
