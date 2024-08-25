import { Injectable, WritableSignal, signal } from '@angular/core';
import { PaymentReminderRepository } from '../interfaces/database';
import { Reminder } from './database.service';
import { nanoid } from 'nanoid';

@Injectable({
  providedIn: 'root',
})
export class SessionStorageService implements PaymentReminderRepository {
  private reminder: WritableSignal<Reminder[]> = signal<Reminder[]>([]);
  private reminder_payed: WritableSignal<Reminder[]> = signal<Reminder[]>([]);

  constructor() {}

  async initializeConnection(): Promise<boolean> {
    await this.loadReminders();
    await this.loadRemindersPayed();
    return true;
  }

  async loadReminders(): Promise<void> {
    const reminders = this.getStorageItem('reminders');
    this.reminder.set(reminders.filter((reminder: Reminder) => !reminder.payment_done));
  }

  async loadRemindersPayed(): Promise<void> {
    const reminders = this.getStorageItem('reminders');
    this.reminder_payed.set(reminders.filter((reminder: Reminder) => reminder.payment_done));
  }

  getReminders(): WritableSignal<Reminder[]> {
    return this.reminder;
  }

  getRemindersPayed(): WritableSignal<Reminder[]> {
    return this.reminder_payed;
  }

  async addReminder(reminder: Reminder): Promise<void> {
    reminder.id = await this.getNextId();
    reminder.uuid = nanoid();
    reminder.payment_done = false;
    const updatedReminders = [reminder, ...this.getStorageItem('reminders')];
    this.setStorageItem('reminders', updatedReminders);
    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async updateReminder(reminder: Reminder): Promise<void> {
    const reminders = this.getStorageItem('reminders');
    const updatedReminders = reminders.map((_reminder: Reminder) =>
      _reminder.id === reminder.id ? reminder : _reminder
    );
    this.setStorageItem('reminders', updatedReminders);
    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async deleteReminder(id: number): Promise<void> {
    const reminders = this.getStorageItem('reminders');
    const updatedReminders = reminders.filter((reminder: Reminder) => reminder.id !== id);
    this.setStorageItem('reminders', updatedReminders);
    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async payReminder(reminder: Reminder): Promise<void> {
    reminder.payment_done = true;
    await this.updateReminder(reminder);
  }

  async getLastInsertId(): Promise<number> {
    const reminders = this.getStorageItem('reminders');
    return reminders.reduce((maxId, reminder) => Math.max(maxId, reminder.id), 0);
  }

  private async getNextId(): Promise<number> {
    const lastId = await this.getLastInsertId();
    return lastId + 1;
  }

  private getStorageItem(key: string): any[] {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setStorageItem(key: string, value: any[]): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  }
}