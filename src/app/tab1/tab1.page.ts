import { Component } from '@angular/core';
import { Reminder } from '../services/database.service';
import { AlertController } from '@ionic/angular';
import {
  CancelOptions,
  LocalNotifications,
  ScheduleOptions,
} from '@capacitor/local-notifications';
import { MediatorStorageService } from '../services/mediator-storage.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page {
  reminders = this.database.getReminders();

  constructor(
    private database: MediatorStorageService,
    private alertController: AlertController
  ) {}

  async ionViewWillEnter() {
    this.loadReminders();
  }

  async loadReminders() {
    this.reminders = this.database.getReminders();
  }

  async addNewReminder() {
    const alert = await this.alertController.create({
      header: 'Nuevo Recordatorio',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre',
        },
        {
          name: 'value',
          type: 'number',
          placeholder: 'Valor a Pagar',
        },
        {
          name: 'date',
          type: 'date',
          placeholder: 'Fecha',
        },
        {
          name: 'reminder_time',
          type: 'time',
          placeholder: 'Hora',
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Guardar',
          handler: async (data :Reminder) => {
            if (
              data.name.trim().length === 0 ||
              data.value.toString().length === 0 ||
              data.date.toString().length === 0 ||
              data.reminder_time.trim().length === 0
            ) {
              alert.message =
                'No puede haber campos vacios, Complete los campos';
              return false;
            } else {
              await this.database.addReminder(data);
              this.loadReminders();
              let lastInsertedId = await this.database.getLastInsertedId();
              data.id = lastInsertedId;
              this.ScheduleLocalNotification(data);
            }
            return true;
          },
          //handler: async (data) => {
          // await this.database.addReminder(data);
          // this.loadReminders();
          //  this.ScheduleLocalNotification(data);
          //}
        },
      ],
    });

    await alert.present();
  }

  async editReminder(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Editar Recordatorio',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name',
          value: reminder.name,
        },
        {
          name: 'value',
          type: 'number',
          placeholder: 'Value',
          value: reminder.value,
        },
        {
          name: 'date',
          type: 'date',
          placeholder: 'Date',
          value: reminder.date,
        },
        {
          name: 'reminder_time',
          type: 'time',
          placeholder: 'Hora',
          value: reminder.reminder_time,
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Guardar',
          handler: async (data:Reminder) => {
            console.log('datos for edit', data)
            if (
              data.name.trim().length === 0 ||
              data.value.toString().length === 0 ||
              data.date.toString().length === 0 ||
              data.reminder_time.trim().length === 0
            ) {
              alert.message =
                'No puede haber campos vacios, Complete los campos';
              return false;
            } else {
              data.id = reminder.id;
              await this.cancelNotificationById(data.id);
              await this.database.updateReminder(data);
              this.loadReminders();
              this.ScheduleLocalNotification(data);
            }
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async deleteReminder(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Confirmar Borrado',
      message: 'Esta seguro de eliminar este recordatorio?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Borrar',
          handler: async () => {
            const { id, uuid } = reminder;
            await this.cancelNotificationById(id);
            await this.database.deleteReminder({id, uuid: (uuid ?? '')});
            this.loadReminders();
          },
        },
      ],
    });

    await alert.present();
  }

  async payReminder(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Confirmar Pago',
      message: 'Esta seguro de marcar este recordatorio como pagado?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Pagar',
          handler: async () => {
            const id  = reminder.id;
            await this.cancelNotificationById(id);
            await this.database.payReminder(reminder);
            await this.loadReminders();
          },
        },
      ],
    });

    await alert.present();
  }

  async ScheduleLocalNotification(reminder: Reminder) {
    await LocalNotifications.requestPermissions();

    const dateParts = reminder.date.toString().split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);

    const timeParts = reminder.reminder_time.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);

    const now = new Date(year, month, day, hours, minutes);

    console.log('La fecha es ', now);

    const options: ScheduleOptions = {
      notifications: [
        {
          id: reminder.id,
          title: 'Recuerda pagar',
          body: 'Pago de: ' + reminder.name,
          largeBody:
            'Pago de ' + reminder.name + ' por valor ' + reminder.value,
          summaryText: 'Recuerda pagar tu ' + reminder.name,
          schedule: {
            at: now,
          },
        },
      ],
    };

    try {
      await LocalNotifications.schedule(options);
    } catch (ex) {
      alert(JSON.stringify(ex));
    }
  }

 async cancelNotificationById(notificationId: number) {

    let options: CancelOptions = {
      notifications:[{
        id: notificationId
      }
      ]
    };

    await LocalNotifications.cancel(options)
      .then(() => {
        console.log('Notification canceled successfully');
      })
      .catch((err) => {
        console.error('Error canceling notification:', err);
      });
  }
}
