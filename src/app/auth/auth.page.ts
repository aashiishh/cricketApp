import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: false
})
export class AuthPage implements OnInit, OnDestroy {
  email = '';
  password = '';
  displayName = '';
  phoneNumber = '';
  otpCode = '';
  authMethod: 'email' | 'phone' = 'email';
  isLogin = true;
  otpSent = false;
  private routeSub: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.routeSub = this.route.data.subscribe(data => {
      this.isLogin = data['mode'] !== 'register';
    });
  }

  onSubmit() {
    if (!this.email || !this.password || (!this.isLogin && !this.displayName)) {
      this.showAlert('Missing Details', 'Please fill all required fields.');
      return;
    }

    this.loadingCtrl.create({
      message: this.isLogin ? 'Signing in...' : 'Creating account...'
    }).then(loader => {
      loader.present();
      const authRequest = this.isLogin
        ? this.authService.login(this.email.trim(), this.password)
        : this.authService.register(this.email.trim(), this.password, this.displayName.trim());

      authRequest.subscribe({
        next: () => {
          loader.dismiss();
          this.navigateAfterAuth();
        },
        error: error => {
          loader.dismiss();
          this.showAlert('Authentication Failed', error.message || 'Please try again.');
        }
      });
    });
  }

  signInWithGoogle() {
    this.loadingCtrl.create({
      message: 'Opening Google sign-in...'
    }).then(loader => {
      loader.present();
      this.authService.signInWithGoogle().subscribe({
        next: () => {
          loader.dismiss();
          this.navigateAfterAuth();
        },
        error: error => {
          loader.dismiss();
          this.showAlert('Google Sign-In Failed', error.message || 'Please try again.');
        }
      });
    });
  }

  sendOtp() {
    if (!this.phoneNumber) {
      this.showAlert('Phone Required', 'Please enter your phone number with country code.');
      return;
    }

    this.authService.initPhoneVerifier('phone-recaptcha');
    this.loadingCtrl.create({
      message: 'Sending OTP...'
    }).then(loader => {
      loader.present();
      this.authService.sendPhoneOtp(this.phoneNumber.trim()).subscribe({
        next: () => {
          loader.dismiss();
          this.otpSent = true;
        },
        error: error => {
          loader.dismiss();
          this.showAlert('OTP Failed', error.message || 'Please try again.');
        }
      });
    });
  }

  verifyOtp() {
    if (!this.otpCode) {
      this.showAlert('OTP Required', 'Please enter the OTP sent to your phone.');
      return;
    }

    this.loadingCtrl.create({
      message: 'Verifying OTP...'
    }).then(loader => {
      loader.present();
      this.authService.verifyPhoneOtp(this.otpCode.trim()).subscribe({
        next: () => {
          loader.dismiss();
          this.navigateAfterAuth();
        },
        error: error => {
          loader.dismiss();
          this.showAlert('OTP Verification Failed', error.message || 'Please try again.');
        }
      });
    });
  }

  toggleMode() {
    this.router.navigateByUrl(this.isLogin ? '/auth/register' : '/auth/login');
  }

  setAuthMethod(method: 'email' | 'phone') {
    this.authMethod = method;
    this.otpSent = false;
    this.otpCode = '';
  }

  showOtpDisabledToast() {
    this.authMethod = 'email';
    this.otpSent = false;
    this.otpCode = '';
    this.toastCtrl.create({
      message: 'Sign-in with OTP option is temporarily disabled',
      duration: 2200,
      position: 'bottom',
      color: 'danger',
      cssClass: 'otp-disabled-toast'
    }).then(toast => toast.present());
  }

  private navigateAfterAuth() {
    if (!this.authService.currentUser?.playerId) {
      this.router.navigateByUrl('/set-player-profile');
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
    this.router.navigateByUrl(returnUrl);
  }

  private showAlert(header: string, message: string) {
    this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    }).then(alert => alert.present());
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }
}
