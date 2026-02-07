import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { MediatorStorageService } from './services/mediator-storage.service';
import { SettingsService } from './services/settings.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private database: MediatorStorageService,
    private settingsService: SettingsService,
    private alertController: AlertController
  ) {
    this.initApp();
  }

  async initApp() {
    // Initialize database connection
    await this.database.initializeConnection();

    // Load categories on startup
    await this.database.loadCategories();

    // Apply saved theme preference
    const settings = this.settingsService.getCurrentSettings();
    this.settingsService.applyTheme(settings.theme);

    // Request permissions on native platforms
    if (Capacitor.isNativePlatform()) {
      await this.requestPermissions();
    }
  }

  private async requestPermissions() {
    try {
      // 1. Check notification permissions
      await this.requestNotificationPermissions();

      // 2. Check exact alarm permissions (Android 12+)
      await this.checkExactAlarmPermission();

    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  }

  private async requestNotificationPermissions() {
    const permStatus = await LocalNotifications.checkPermissions();

    if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
      const alert = await this.alertController.create({
        header: 'Permisos de Notificaciones',
        message: 'PayRemind necesita enviar notificaciones para recordarte tus pagos pendientes. ¿Deseas permitir las notificaciones?',
        buttons: [
          {
            text: 'No permitir',
            role: 'cancel',
          },
          {
            text: 'Permitir',
            handler: async () => {
              await LocalNotifications.requestPermissions();
            },
          },
        ],
      });
      await alert.present();
      await alert.onDidDismiss();
    }
  }

  private async checkExactAlarmPermission() {
    // Check if notifications are granted
    const result = await LocalNotifications.checkPermissions();

    if (result.display === 'granted') {
      // Show a one-time info dialog about exact alarms on Android 12+
      const hasShownAlarmInfo = localStorage.getItem('payremind_alarm_info_shown');

      if (!hasShownAlarmInfo) {
        const alert = await this.alertController.create({
          header: 'Alarmas y Recordatorios',
          message: 'Para asegurar que recibas los recordatorios de pago a tiempo exacto, verifica que PayRemind tenga el permiso "Alarmas y recordatorios".\n\nVe a: Configuración > Apps > PayRemind > Alarmas y recordatorios',
          buttons: [
            {
              text: 'Entendido',
              handler: () => {
                localStorage.setItem('payremind_alarm_info_shown', 'true');
              },
            },
          ],
        });
        await alert.present();
      }
    }
  }
}
