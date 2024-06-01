import { Injectable } from '@angular/core';
import { PaymentReminderRepository } from '../interfaces/database';
import { DatabaseService, Reminder } from './database.service';
import { Capacitor } from '@capacitor/core';
import { SessionStorageService } from './session-storage.service';
import { IDeleteReminder } from '../interfaces/reminder';

@Injectable({
  providedIn: 'root',
})
export class MediatorStorageService implements PaymentReminderRepository {
  private isNative: boolean;

  constructor(
    private _dbSvc: DatabaseService,
    private _sessionStorageSvc: SessionStorageService
  ) {
    this.isNative = Capacitor.isNativePlatform();
  }

  async initializeConnnection() {
    if (this.isNative) {
      await this._dbSvc.createConnectionDB();
    }
    await this.loadReminders();
    return true;
  }

  async loadReminders() {
    return this.isNative
      ? await this._dbSvc.loadReminders()
      : await this._sessionStorageSvc.loadReminders();
  }

  getReminders() {
    return this.isNative
      ? this._dbSvc.getReminders()
      : this._sessionStorageSvc.getReminders();
  }

  getRemindersPayed() {
    return this.isNative
      ? this._dbSvc.getRemindersPayed()
      : this._sessionStorageSvc.getReminders();
  }

  async addReminder(reminder: Reminder) {
    return this.isNative
      ? await this._dbSvc.addReminder(reminder)
      : await this._sessionStorageSvc.addReminder(reminder);
  }

  async updateReminder(reminder: Reminder) {
    return this.isNative
      ? await this._dbSvc.updateReminder(reminder)
      : await this._sessionStorageSvc.updateReminder(reminder);
  }

  async deleteReminder({id, uuid}: IDeleteReminder) {
    return this.isNative
      ? await this._dbSvc.deleteReminder(id)
      : await this._sessionStorageSvc.deleteReminder(uuid);
  }

  async payReminder(reminder: Reminder) {
    return this.isNative
      ? await this._dbSvc.payReminder(reminder)
      : await this._sessionStorageSvc.payReminder(reminder);
  }

  async getLastInsertedId() {
    return this.isNative
      ? await this._dbSvc.getLastInsertId()
      : 0;
  }

}
