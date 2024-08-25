import { Injectable } from '@angular/core';
import { PaymentReminderRepository } from '../interfaces/database';
import { DatabaseService, Reminder } from './database.service';
import { Capacitor } from '@capacitor/core';
import { SessionStorageService } from './session-storage.service';
import { WritableSignal } from '@angular/core';

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

  async initializeConnection(): Promise<boolean> {
    if (this.isNative) {
      return await this._dbSvc.createConnectionDB();
    } else {
      return await this._sessionStorageSvc.initializeConnection();
    }
  }

  async loadReminders(): Promise<void> {
    if (this.isNative) {
      await this._dbSvc.loadReminders();
    } else {
      await this._sessionStorageSvc.loadReminders();
    }
  }

  async loadRemindersPayed(): Promise<void> {
    if (this.isNative) {
      await this._dbSvc.loadRemindersPayed();
    } else {
      await this._sessionStorageSvc.loadRemindersPayed();
    }
  }

  getReminders(): WritableSignal<Reminder[]> {
    return this.isNative
      ? this._dbSvc.getReminders()
      : this._sessionStorageSvc.getReminders();
  }

  getRemindersPayed(): WritableSignal<Reminder[]> {
    return this.isNative
      ? this._dbSvc.getRemindersPayed()
      : this._sessionStorageSvc.getRemindersPayed();
  }

  async addReminder(reminder: Reminder): Promise<void> {
    if (this.isNative) {
      await this._dbSvc.addReminder(reminder);
    } else {
      await this._sessionStorageSvc.addReminder(reminder);
    }
  }

  async updateReminder(reminder: Reminder): Promise<void> {
    if (this.isNative) {
      await this._dbSvc.updateReminder(reminder);
    } else {
      await this._sessionStorageSvc.updateReminder(reminder);
    }
  }

  async deleteReminder(id: number): Promise<void> {
    if (this.isNative) {
      await this._dbSvc.deleteReminder(id);
    } else {
      await this._sessionStorageSvc.deleteReminder(id);
    }
  }

  async payReminder(reminder: Reminder): Promise<void> {
    if (this.isNative) {
      await this._dbSvc.payReminder(reminder);
    } else {
      await this._sessionStorageSvc.payReminder(reminder);
    }
  }

  async getLastInsertId(): Promise<number> {
    return this.isNative
      ? await this._dbSvc.getLastInsertId()
      : await this._sessionStorageSvc.getLastInsertId();
  }
}