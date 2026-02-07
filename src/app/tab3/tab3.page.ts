import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController, ActionSheetController } from '@ionic/angular';
import { MediatorStorageService } from '../services/mediator-storage.service';
import { SettingsService } from '../services/settings.service';
import { Category } from '../services/database.service';
import {
  UserSettings,
  AVAILABLE_CURRENCIES,
  AVAILABLE_TIMEZONES
} from '../interfaces/settings.interface';
import { WritableSignal } from '@angular/core';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
})
export class Tab3Page implements OnInit {
  settings: WritableSignal<UserSettings>;
  categories: WritableSignal<Category[]>;

  availableCurrencies = AVAILABLE_CURRENCIES;
  availableTimezones = AVAILABLE_TIMEZONES;

  constructor(
    private settingsService: SettingsService,
    private database: MediatorStorageService,
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {
    this.settings = this.settingsService.getSettings();
    this.categories = this.database.getCategories();
  }

  ngOnInit() {
    this.loadCategories();
  }

  ionViewWillEnter() {
    this.loadCategories();
  }

  async loadCategories() {
    await this.database.loadCategories();
  }

  // Settings handlers
  async onTimezoneChange(event: any) {
    await this.settingsService.updateSettings({ timeZone: event.detail.value });
    this.showToast('Zona horaria actualizada');
  }

  async onCurrencyChange(event: any) {
    const currency = this.availableCurrencies.find(c => c.code === event.detail.value);
    if (currency) {
      await this.settingsService.updateSettings({
        currency: currency.code,
        currencySymbol: currency.symbol
      });
      this.showToast('Moneda actualizada');
    }
  }

  async onNotifyDaysChange(event: any) {
    await this.settingsService.updateSettings({ notifyDaysBefore: event.detail.value });
    this.showToast('Configuración de notificaciones actualizada');
  }

  async onThemeChange(event: any) {
    await this.settingsService.setTheme(event.detail.value);
    this.showToast('Tema actualizado');
  }

  // Category management
  async addCategory() {
    const alert = await this.alertController.create({
      header: 'Nueva Categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre de la categoría',
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.name?.trim()) {
              await this.selectIconForCategory(data.name.trim());
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async selectIconForCategory(name: string) {
    const icons = [
      'flash-outline', 'card-outline', 'cash-outline', 'calendar-outline',
      'home-outline', 'car-outline', 'medkit-outline', 'school-outline',
      'fitness-outline', 'restaurant-outline', 'cart-outline', 'phone-portrait-outline',
    ];

    const alert = await this.alertController.create({
      header: 'Seleccionar Icono',
      inputs: icons.map((icon, index) => ({
        name: 'icon',
        type: 'radio' as const,
        label: icon.replace('-outline', ''),
        value: icon,
        checked: index === 0,
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Siguiente',
          handler: async (icon) => {
            await this.selectColorForCategory(name, icon);
          },
        },
      ],
    });

    await alert.present();
  }

  private async selectColorForCategory(name: string, icon: string) {
    const colors = [
      { label: 'Amarillo', value: '#ffd534' },
      { label: 'Azul', value: '#5260ff' },
      { label: 'Rojo', value: '#eb445a' },
      { label: 'Celeste', value: '#3dc2ff' },
      { label: 'Verde', value: '#2dd36f' },
      { label: 'Naranja', value: '#ffa500' },
      { label: 'Rosa', value: '#ff6b9d' },
      { label: 'Morado', value: '#9b59b6' },
    ];

    const alert = await this.alertController.create({
      header: 'Seleccionar Color',
      inputs: colors.map((color, index) => ({
        name: 'color',
        type: 'radio' as const,
        label: color.label,
        value: color.value,
        checked: index === 0,
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Guardar',
          handler: async (color) => {
            await this.database.addCategory({ name, icon, color });
            this.showToast('Categoría creada');
          },
        },
      ],
    });

    await alert.present();
  }

  async deleteCategory(category: Category) {
    const alert = await this.alertController.create({
      header: 'Eliminar Categoría',
      message: `¿Está seguro de eliminar "${category.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: async () => {
            await this.database.deleteCategory(category.id);
            this.showToast('Categoría eliminada');
          },
        },
      ],
    });

    await alert.present();
  }

  // Export/Import - using clipboard for cross-platform compatibility
  async exportData() {
    try {
      const data = await this.database.exportData();
      const jsonString = JSON.stringify(data, null, 2);

      await navigator.clipboard.writeText(jsonString);
      this.showToast('Datos copiados al portapapeles. Guárdalos en un lugar seguro.', 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showToast('Error al exportar datos', 'danger');
    }
  }

  async importData() {
    const alert = await this.alertController.create({
      header: 'Importar Datos',
      message: 'Pegue el contenido del archivo de respaldo JSON:',
      inputs: [
        {
          name: 'jsonData',
          type: 'textarea',
          placeholder: '{"reminders": [...], "categories": [...]}',
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Importar',
          handler: async (data) => {
            try {
              const parsed = JSON.parse(data.jsonData);
              if (parsed.reminders && parsed.categories) {
                const success = await this.database.importData(parsed);
                if (success) {
                  this.showToast('Datos importados correctamente', 'success');
                } else {
                  this.showToast('Error al importar datos', 'danger');
                }
              } else {
                this.showToast('Formato de datos inválido', 'danger');
              }
            } catch (error) {
              this.showToast('JSON inválido', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async resetSettings() {
    const alert = await this.alertController.create({
      header: 'Restablecer Configuración',
      message: '¿Está seguro de restablecer toda la configuración a los valores predeterminados?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Restablecer',
          cssClass: 'danger',
          handler: async () => {
            await this.settingsService.resetSettings();
            this.showToast('Configuración restablecida');
          },
        },
      ],
    });

    await alert.present();
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
