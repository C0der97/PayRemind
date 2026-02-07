import { Component } from '@angular/core';
import { MediatorStorageService } from '../services/mediator-storage.service';
import { SettingsService } from '../services/settings.service';
import { Reminder, Category } from '../services/database.service';
import { WritableSignal } from '@angular/core';
import * as moment from 'moment-timezone';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
})
export class Tab2Page {
  reminders: WritableSignal<Reminder[]>;
  categories: WritableSignal<Category[]>;

  // Stats
  totalPaid: number = 0;
  thisMonthPaid: number = 0;

  constructor(
    private database: MediatorStorageService,
    private settingsService: SettingsService
  ) {
    this.reminders = this.database.getRemindersPayed();
    this.categories = this.database.getCategories();
  }

  get timeZone(): string {
    return this.settingsService.getTimeZone();
  }

  get currencyCode(): string {
    return this.settingsService.getCurrency();
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    await this.database.loadRemindersPayed();
    await this.database.loadCategories();
    this.calculateStats();
  }

  private calculateStats() {
    const payed = this.reminders();
    this.totalPaid = payed.reduce((sum, r) => sum + r.value, 0);

    const now = moment().tz(this.timeZone);
    const startOfMonth = now.clone().startOf('month');

    this.thisMonthPaid = payed
      .filter(r => moment(r.datetime).tz(this.timeZone).isAfter(startOfMonth))
      .reduce((sum, r) => sum + r.value, 0);
  }

  getCategoryById(categoryId?: number): Category | undefined {
    if (!categoryId) return undefined;
    return this.categories().find(c => c.id === categoryId);
  }

  formatDate(datetime: string): string {
    return moment(datetime).tz(this.timeZone).format('DD/MM/YYYY');
  }
}
