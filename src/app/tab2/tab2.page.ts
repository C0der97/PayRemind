import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { MediatorStorageService } from '../services/mediator-storage.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {
  reminders = this.database.getRemindersPayed();
  constructor(private database: MediatorStorageService, private alertController: AlertController) {

  }
  async ionViewWillEnter() {
    await this.loadReminders();
    await this.database.getRemindersPayed();
  }

  async loadReminders() {
    this.reminders = this.database.getRemindersPayed();
  }

}
