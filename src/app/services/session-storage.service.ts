import { Injectable, WritableSignal, signal } from '@angular/core';
import { PaymentReminderRepository } from '../interfaces/database';
import { Reminder } from './database.service';
import { nanoid } from 'nanoid';

@Injectable({
  providedIn: 'root',
})
export class SessionStorageService implements PaymentReminderRepository {
  constructor() {}
  private reminder: WritableSignal<Reminder[]> = signal<Reminder[]>([]);

  async initializeConnnection() {
    this.loadReminders();
    return true;
  }

  async loadReminders() {
    const reminders = JSON.parse(sessionStorage.getItem('reminders') || '[]');
    return this.reminder.set(
      reminders.filter((reminder: Reminder) => !reminder?.payment_done)
    );
  }

  getReminders() {
    return this.reminder;
  }

  async addReminder(reminder: Reminder) {
    reminder.uuid = nanoid();
    const updatedReminders = [reminder, ...this.reminder()];
    this.reminder.set(updatedReminders);
    this.saveEmployeesToStorage();
  }

  private saveEmployeesToStorage(reminder?: Reminder[]): void {
    const reminderJson = JSON.stringify(reminder ?? this.reminder());
    sessionStorage.setItem('reminders', reminderJson);
  }

  async updateReminder(reminder: Reminder) {
    const reminders = this.reminder();
    const remindersEdited = reminders.map((_reminder: Reminder) => {
      return _reminder.uuid === reminder.uuid ? reminder : _reminder;
    });
    this.saveEmployeesToStorage(remindersEdited);
    this.loadReminders();
  }

  async deleteReminder(uuid: string) {
    const currentReminders = this.reminder();
    const updatedReminders = currentReminders.filter(
      (reminder: Reminder) => reminder.uuid !== uuid
    );
    this.reminder.set(updatedReminders);
    this.saveEmployeesToStorage(updatedReminders);
    this.loadReminders();
  }

  async payReminder(reminder: Reminder) {
    const reminders = this.reminder();
    reminder.payment_done = true;
    const remindersEdited = reminders.map((_reminder: Reminder) => {
      return _reminder.uuid === reminder.uuid ? reminder : _reminder;
    });
    this.saveEmployeesToStorage(remindersEdited);
    this.loadReminders();
  }


}
