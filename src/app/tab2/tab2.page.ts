import { Component } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {
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

}
