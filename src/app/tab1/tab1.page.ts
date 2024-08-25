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
import * as moment from 'moment-timezone';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page implements OnInit {
  reminders: WritableSignal<Reminder[]>;
  timeZone: string = 'America/Bogota';

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

  private splitDateTime(datetime: string): [string, string] {
    const date = moment(datetime).tz(this.timeZone);
    return [
      date.format('YYYY-MM-DD'),
      date.format('HH:mm')
    ];
  }

  private async createReminderAlert(header: string, reminder?: Reminder) {
    const [dateValue, timeValue] = reminder ? this.splitDateTime(reminder.datetime) : ['', ''];

    console.log('reminder.datetime', reminder?.datetime ?? '');
    console.log('dateValue', dateValue);
    console.log('timeValue', timeValue);

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

              console.log('newReminder', newReminder)

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

  private combineDateAndTime(date: string, time: string): string {
    const [hours, minutes] = time.split(':');
    return moment.tz(`${date} ${hours}:${minutes}`, 'YYYY-MM-DD HH:mm', this.timeZone).toISOString();
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
    const colombiaTime = moment(reminder.datetime).tz(this.timeZone).toDate();
  
    console.log('colombiaTime', colombiaTime)
  
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
              datetime: newDate,
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

  formatTimeWithAMPM(datetime: string): string {
    return moment(datetime).tz(this.timeZone).format('hh:mm A');
  }

  private getNextMonthDate(currentDate: string): string {
    return moment(currentDate).tz(this.timeZone).add(1, 'month').toISOString();
  }
}