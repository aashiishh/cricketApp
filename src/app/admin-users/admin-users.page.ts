import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../auth/auth.service';
import { UserProfile, UserRole } from '../models/app-user';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  standalone: false
})
export class AdminUsersPage implements OnInit {
  users: UserProfile[] = [];
  isLoading = false;
  readonly assignableRoles: UserRole[] = ['admin', 'player'];

  constructor(
    public authService: AuthService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.loadingCtrl.create({
      message: 'Loading users...'
    }).then(loader => {
      loader.present();
      this.authService.fetchUserProfiles().subscribe({
        next: users => {
          loader.dismiss();
          this.isLoading = false;
          this.users = users.sort((first, second) => first.displayName.localeCompare(second.displayName));
        },
        error: error => {
          loader.dismiss();
          this.isLoading = false;
          this.showToast(error.message || 'Unable to load users.', 'danger');
        }
      });
    });
  }

  async confirmRoleChange(user: UserProfile, role: UserRole) {
    if (user.role === role) {
      return;
    }
    if (user.uid === this.authService.currentUser?.uid) {
      this.showToast('You cannot change your own role while signed in.', 'warning');
      return;
    }
    if (user.role === 'super-admin' || role === 'super-admin') {
      this.showToast('Super Admin role cannot be changed from this screen.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Change user role?',
      message: 'Set '+this.getUserName(user)+' as '+this.getRoleLabel(role)+'?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: () => this.updateRole(user, role)
        }
      ]
    });
    await alert.present();
  }

  getRoleLabel(role: UserRole) {
    if (role === 'super-admin') {
      return 'Super Admin';
    }
    if (role === 'admin') {
      return 'Admin';
    }
    return 'Player';
  }

  getUserName(user: UserProfile) {
    return user.displayName || user.email || user.uid;
  }

  private updateRole(user: UserProfile, role: UserRole) {
    this.authService.updateUserRole(user.uid, role).subscribe({
      next: () => {
        user.role = role;
        user.updatedAt = new Date().toISOString();
        this.showToast(this.getUserName(user)+' is now '+this.getRoleLabel(role)+'.', 'success');
      },
      error: error => this.showToast(error.message || 'Unable to update role.', 'danger')
    });
  }

  private showToast(message: string, color: string) {
    this.toastCtrl.create({
      message,
      color,
      position: 'bottom',
      duration: 2500
    }).then(toast => toast.present());
  }
}
