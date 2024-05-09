import { Component } from '@angular/core';
import { DatabaseService, Reminder } from '../services/database.service';
import { AlertController } from '@ionic/angular';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  reminders = this.database.getReminders();

  constructor(private database: DatabaseService, private alertController: AlertController) {
  
  }

  async ionViewWillEnter() {
    await this.database.initializeConnnection();
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
          placeholder: 'Nombre'
        },
        {
          name: 'value',
          type: 'number',
          placeholder: 'Valor a Pagar'
        },
        {
          name: 'date',
          type: 'date',
          placeholder: 'Fecha'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            await this.database.addReminder(data);
            this.loadReminders();
            this.ScheduleLocalNotification(data);
          }
        }
      ]
    });

    await alert.present();
  }

  async editReminder(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Edit Reminder',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name',
          value: reminder.name
        },
        {
          name: 'value',
          type: 'number',
          placeholder: 'Value',
          value: reminder.value
        },
        {
          name: 'date',
          type: 'date',
          placeholder: 'Date',
          value: reminder.date
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            data.id = reminder.id; // Pass the id of the reminder being edited
            await this.database.updateReminder(data);
            this.loadReminders();
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteReminder(id: number) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: 'Esta seguro de eliminar este recordatorio?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          handler: async () => {
            await this.database.deleteReminder(id);
            this.loadReminders();
          }
        }
      ]
    });

    await alert.present();
  }

  async ScheduleLocalNotification(reminder: Reminder){


    await LocalNotifications.requestPermissions();

    const now = new Date(reminder.date);
    now.setHours(13, 45, 0, 0); 

    const options : ScheduleOptions = {
      notifications:[
        {
          id: 11,
          title: 'Recuerda pagar',
          body: 'Pago de: '+ reminder.name,
          largeBody: 'Pago de '+ reminder.name+ " por valor "+ reminder.value,
          summaryText: 'Recuerda pagar tu '+reminder.name,
          schedule: {
            at: now
          }
        }
      ]
    };

    try{
      await LocalNotifications.schedule(options);
    }catch(ex){
      alert(JSON.stringify(ex));
    }

  }
}
