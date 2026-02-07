import { Injectable, WritableSignal } from '@angular/core';
import { PaymentReminderRepository } from '../interfaces/database';
import { DatabaseService, Reminder, Category } from './database.service';
import { Capacitor } from '@capacitor/core';
import { SessionStorageService } from './session-storage.service';

@Injectable({
  providedIn: 'root',
})
export class MediatorStorageService implements PaymentReminderRepository {
  private readonly isNative: boolean;
  private readonly repository: DatabaseService | SessionStorageService;

  constructor(
    private _dbSvc: DatabaseService,
    private _sessionStorageSvc: SessionStorageService
  ) {
    this.isNative = Capacitor.isNativePlatform();
    // Strategy pattern: select the appropriate repository based on platform
    this.repository = this.isNative ? this._dbSvc : this._sessionStorageSvc;
  }

  async initializeConnection(): Promise<boolean> {
    return this.repository.initializeConnection();
  }

  async loadReminders(): Promise<void> {
    return this.repository.loadReminders();
  }

  async loadRemindersPayed(): Promise<void> {
    return this.repository.loadRemindersPayed();
  }

  getReminders(): WritableSignal<Reminder[]> {
    return this.repository.getReminders();
  }

  getRemindersPayed(): WritableSignal<Reminder[]> {
    return this.repository.getRemindersPayed();
  }

  async addReminder(reminder: Reminder): Promise<void> {
    return this.repository.addReminder(reminder);
  }

  async updateReminder(reminder: Reminder): Promise<void> {
    return this.repository.updateReminder(reminder);
  }

  async deleteReminder(id: number): Promise<void> {
    return this.repository.deleteReminder(id);
  }

  async payReminder(reminder: Reminder): Promise<void> {
    return this.repository.payReminder(reminder);
  }

  async getLastInsertId(): Promise<number> {
    return this.repository.getLastInsertId();
  }

  // New category methods
  async loadCategories(): Promise<void> {
    return this.repository.loadCategories();
  }

  getCategories(): WritableSignal<Category[]> {
    return this.repository.getCategories();
  }

  async addCategory(category: Omit<Category, 'id'>): Promise<void> {
    return this.repository.addCategory(category);
  }

  async deleteCategory(id: number): Promise<void> {
    return this.repository.deleteCategory(id);
  }

  // Export/Import methods
  async exportData(): Promise<{ reminders: Reminder[]; categories: Category[] }> {
    return this.repository.exportData();
  }

  async importData(data: { reminders: Reminder[]; categories: Category[] }): Promise<boolean> {
    return this.repository.importData(data);
  }
}