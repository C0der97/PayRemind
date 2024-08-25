import { Component, OnInit } from '@angular/core';
import { Reminder } from '../services/database.service';
import { AlertController } from '@ionic/angular';
import {
  CancelOptions,
  LocalNotifications,
  ScheduleOptions,
} from '@capacitor/local-notifications';
import { MediatorStorageService } from '../services/mediator-storage.service';
import { WritableSignal } from '@angular/core';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page implements OnInit {
  reminders: WritableSignal<Reminder[]>;

  constructor(
    private database: MediatorStorageService,
    private alertController: AlertController
  ) {
    this.reminders = this.database.getReminders();
  }

  ngOnInit() {
    this.initializeNotifications();
  }

  ionViewWillEnter() {
    this.loadReminders();
  }

  private async initializeNotifications() {
    await LocalNotifications.requestPermissions();
  }

  private async loadReminders() {
    await this.database.loadReminders();
  }

  async addNewReminder() {
    const alert = await this.createReminderAlert('Nuevo Recordatorio');
    await alert.present();
  }

  async editReminder(reminder: Reminder) {
    const alert = await this.createReminderAlert('Editar Recordatorio', reminder);
    await alert.present();
  }

  private async createReminderAlert(header: string, reminder?: Reminder) {
    const [dateValue, timeValue] = reminder ? this.splitDateTime(reminder.datetime) : ['', ''];


    console.log('reminder.datetime', reminder?.datetime ?? '')
    console.log('dateValue', dateValue)
    console.log('timeValue', timeValue)

    return this.alertController.create({
      header,
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre',
          value: reminder?.name || '',
        },
        {
          name: 'value',
          type: 'number',
          placeholder: 'Valor a Pagar',
          value: reminder?.value || '',
        },
        {
          name: 'date',
          type: 'date',
          placeholder: 'Fecha',
          value: dateValue,
        },
        {
          name: 'time',
          type: 'time',
          placeholder: 'Hora',
          value: timeValue,
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Guardar',
          handler: async (data: {name: string; value: string; date: string; time: string}) => {
            if (this.validateReminderData(data)) {
              const newReminder: Reminder = this.createReminderFromData(data, reminder);
              await this.saveReminder(newReminder, reminder ? true : false);
              return true;
            }
            return false;
          },
        },
      ],
    });
  }

  private validateReminderData(data: {name: string; value: string; date: string; time: string}): boolean {
    return !!(data.name?.trim() && data.value && data.date && data.time?.trim());
  }

  private createReminderFromData(data: {name: string; value: string; date: string; time: string}, existingReminder?: Reminder): Reminder {
    return {
      ...(existingReminder || {}),
      name: data.name,
      value: Number(data.value),
      datetime: this.combineDateAndTime(data.date, data.time),
      id: existingReminder?.id || 0,
      payment_done: false,
    };
  }

  private async saveReminder(reminder: Reminder, isEdit: boolean) {
    if (isEdit) {
      await this.cancelNotificationById(reminder.id);
      await this.database.updateReminder(reminder);
    } else {
      await this.database.addReminder(reminder);
      reminder.id = await this.database.getLastInsertId();
    }
    await this.scheduleLocalNotification(reminder);
    await this.loadReminders();
  }

  async deleteReminder(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Confirmar Borrado',
      message: '¿Está seguro de eliminar este recordatorio?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Borrar',
          handler: async () => {
            await this.cancelNotificationById(reminder.id);
            await this.database.deleteReminder(reminder.id);
            await this.loadReminders();
          },
        },
      ],
    });

    await alert.present();
  }

  async payReminder(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Confirmar Pago',
      message: '¿Está seguro de marcar este recordatorio como pagado?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Pagar',
          handler: async () => {
            await this.cancelNotificationById(reminder.id);
            await this.database.payReminder(reminder);
            await this.loadReminders();
          },
        },
      ],
    });

    await alert.present();
  }

  private async scheduleLocalNotification(reminder: Reminder) {
    const colombiaTime = new Date(reminder.datetime);
  
    console.log('Scheduling notification for:', colombiaTime.toISOString());
  
    const options: ScheduleOptions = {
      notifications: [
        {
          id: reminder.id,
          title: 'Recuerda pagar',
          body: `Pago de: ${reminder.name}`,
          largeBody: `Pago de ${reminder.name} por valor ${reminder.value}`,
          summaryText: `Recuerda pagar tu ${reminder.name}`,
          schedule: { at: colombiaTime },
        },
      ],
    };
  
    try {
      await LocalNotifications.schedule(options);
    } catch (ex) {
      console.error('Error al programar la notificación:', ex);
    }
  }

  private async cancelNotificationById(notificationId: number) {
    const options: CancelOptions = {
      notifications: [{ id: notificationId }]
    };

    try {
      await LocalNotifications.cancel(options);
    } catch (err) {
      console.error('Error canceling notification:', err);
    }
  }

  async rescheduleNotification(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Reprogramar Recordatorio',
      message: '¿Desea marcar este recordatorio como pagado y crear uno nuevo para el próximo mes?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Reprogramar',
          handler: async () => {
            await this.payReminder(reminder);
            const newDate = this.getNextMonthDate(reminder.datetime);
            const newReminder: Reminder = {
              ...reminder,
              id: 0,
              datetime: newDate.toISOString(),
              uuid: undefined,
              payment_done: false
            };
            await this.database.addReminder(newReminder);
            newReminder.id = await this.database.getLastInsertId();
            await this.scheduleLocalNotification(newReminder);
            await this.loadReminders();
          },
        },
      ],
    });

    await alert.present();
  }


  private splitDateTime(datetime: string): [string, string] {
    const colombiaTime = new Date(datetime);
    
    const dateString = colombiaTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = colombiaTime.toTimeString().slice(0, 5);  // HH:MM
    
    console.log('Original datetime:', datetime);
    console.log('Colombia date:', dateString);
    console.log('Colombia time:', timeString);
    
    return [dateString, timeString];
  }

  private combineDateAndTime(date: string, time: string): string {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // Crear la fecha en la zona horaria de Colombia
    const colombiaTime = new Date(year, month - 1, day, hours, minutes);
    
    console.log('Combined Colombia time:', colombiaTime.toISOString());
    
    return colombiaTime.toISOString();
  }

  formatTimeWithAMPM(datetime: string): string {
    const colombiaTime = new Date(datetime);
    
    const formattedTime = colombiaTime.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'America/Bogota'
    });
    
    console.log('Original datetime:', datetime);
    console.log('Formatted Colombia time:', formattedTime);
    
    return formattedTime;
  }

  private getNextMonthDate(currentDate: string): string {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString();
  }

}