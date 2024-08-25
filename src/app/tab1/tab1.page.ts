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

    await LocalNotifications.requestPermissions();

    const options: ScheduleOptions = {
      notifications: [
        {
          id: 123133,
          title: 'Notii',
          body: 'Noti',
          largeBody: 'not',
          summaryText: 'asdad',
          schedule: {
            at: new Date(Date.now())
          },
        },
      ],
    };


    await LocalNotifications.schedule(options);

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
          handler: async (data: any) => {
            if (
              data.name.trim().length === 0 ||
              data.value.toString().length === 0 ||
              data.date.length === 0 ||
              data.reminder_time.trim().length === 0
            ) {
              alert.message =
                'No puede haber campos vacios, Complete los campos';
              return false;
            } else {
              const reminder: Reminder = {
                ...data,
                id: 0,
                date: new Date(data.date),
                payment_done: false,
                value: Number(data.value)
              };
              await this.database.addReminder(reminder);
              this.loadReminders();
              let lastInsertedId = await this.database.getLastInsertedId();
              reminder.id = lastInsertedId;
              await this.ScheduleLocalNotification(reminder);
            }
            return true;
          },
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
          value: this.formatDateForInput(reminder.date),
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
          handler: async (data: any) => {
            if (
              data.name.trim().length === 0 ||
              data.value.toString().length === 0 ||
              data.date.length === 0 ||
              data.reminder_time.trim().length === 0
            ) {
              alert.message =
                'No puede haber campos vacios, Complete los campos';
              return false;
            } else {
              const updatedReminder: Reminder = {
                ...reminder,
                ...data,
                date: new Date(data.date),
                value: Number(data.value)
              };
              await this.cancelNotificationById(updatedReminder.id);
              await this.database.updateReminder(updatedReminder);
              this.loadReminders();
              await this.ScheduleLocalNotification(updatedReminder);
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

    const [hours, minutes] = reminder.reminder_time.split(':').map(Number);

    const notificationDate = new Date(reminder.date);
    notificationDate.setHours(hours, minutes, 0, 0);

    // Ajustar la fecha a UTC
    const utcNotificationDate = new Date(notificationDate.getTime() - notificationDate.getTimezoneOffset() * 60000);

    console.log('La fecha de notificación es ', utcNotificationDate.toISOString());

    const options: ScheduleOptions = {
      notifications: [
        {
          id: reminder.id,
          title: 'Recuerda pagar',
          body: 'Pago de: ' + reminder.name,
          largeBody: 'Pago de ' + reminder.name + ' por valor ' + reminder.value,
          summaryText: 'Recuerda pagar tu ' + reminder.name,
          schedule: {
            at: utcNotificationDate,
          },
        },
      ],
    };

    try {
      await LocalNotifications.schedule(options);
    } catch (ex) {
      console.error('Error al programar la notificación:', ex);
      alert(JSON.stringify(ex));
    }
  }

  async cancelNotificationById(notificationId: number) {
    let options: CancelOptions = {
      notifications:[{
        id: notificationId
      }]
    };

    await LocalNotifications.cancel(options)
      .then(() => {
        console.log('Notification canceled successfully');
      })
      .catch((err) => {
        console.error('Error canceling notification:', err);
      });
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
            // Marcar el recordatorio actual como pagado
            await this.payReminder(reminder);

            // Asegurarse de que reminder.date sea un objeto Date
            const currentDate = reminder.date instanceof Date ? reminder.date : new Date(reminder.date);

            // Calcular la nueva fecha para el próximo mes
            const newDate = this.getNextMonthDate(currentDate, reminder.reminder_time);
            console.log('La nueva fecha es ', newDate.toLocaleString());

            // Crear un nuevo recordatorio para el próximo mes
            const newReminder: Reminder = {
              ...reminder,
              id: 0, // El ID se asignará al insertarlo
              date: newDate,
              uuid: undefined, // Se generará un nuevo UUID
              payment_done: false
            };

            // Añadir el nuevo recordatorio
            await this.database.addReminder(newReminder);
            let lastInsertedId = await this.database.getLastInsertedId();
            newReminder.id = lastInsertedId;

            // Programar la nueva notificación
            await this.ScheduleLocalNotification(newReminder);

            // Recargar la lista de recordatorios
            await this.loadReminders();
          },
        },
      ],
    });

    await alert.present();
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getNextMonthDate(currentDate: Date | string, currentTime: string): Date {
    // Asegurarse de que currentDate sea un objeto Date
    const date = currentDate instanceof Date ? currentDate : new Date(currentDate);
    
    if (isNaN(date.getTime())) {
      console.error('Fecha inválida:', currentDate);
      return new Date(); // Devolver la fecha actual si la entrada es inválida
    }

    const [hours, minutes] = currentTime.split(':').map(Number);
    
    let newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1);
    newDate.setHours(hours, minutes, 0, 0);
    
    // Ajustar para el último día del mes si es necesario
    if (date.getDate() > 28 && newDate.getDate() !== date.getDate()) {
      newDate = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0, hours, minutes, 0, 0);
    }
    
    return newDate;
  }

  formatTimeWithAMPM(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    
    let hours12 = hours % 12;
    hours12 = hours12 ? hours12 : 12; // 0 should be converted to 12
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hoursStr = hours12.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    
    return `${hoursStr}:${minutesStr} ${ampm}`;
  }
}