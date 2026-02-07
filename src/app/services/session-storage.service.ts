import { Injectable, WritableSignal, signal } from '@angular/core';
import { PaymentReminderRepository } from '../interfaces/database';
import { Reminder, Category } from './database.service';
import { nanoid } from 'nanoid';

@Injectable({
  providedIn: 'root',
})
export class SessionStorageService implements PaymentReminderRepository {
  private reminder: WritableSignal<Reminder[]> = signal<Reminder[]>([]);
  private reminder_payed: WritableSignal<Reminder[]> = signal<Reminder[]>([]);
  private categories: WritableSignal<Category[]> = signal<Category[]>([]);

  private readonly REMINDERS_KEY = 'reminders';
  private readonly CATEGORIES_KEY = 'categories';

  constructor() { }

  async initializeConnection(): Promise<boolean> {
    this.initializeDefaultCategories();
    await this.loadCategories();
    await this.loadReminders();
    await this.loadRemindersPayed();
    return true;
  }

  private initializeDefaultCategories(): void {
    const existing = this.getStorageItem(this.CATEGORIES_KEY);
    if (existing.length === 0) {
      const defaultCategories: Category[] = [
        { id: 1, name: 'Servicios', icon: 'flash-outline', color: '#ffd534' },
        { id: 2, name: 'Tarjetas', icon: 'card-outline', color: '#5260ff' },
        { id: 3, name: 'Préstamos', icon: 'cash-outline', color: '#eb445a' },
        { id: 4, name: 'Suscripciones', icon: 'calendar-outline', color: '#3dc2ff' },
        { id: 5, name: 'Otros', icon: 'pricetag-outline', color: '#92949c' },
      ];
      this.setStorageItem(this.CATEGORIES_KEY, defaultCategories);
    }
  }

  async loadCategories(): Promise<void> {
    const categories = this.getStorageItem(this.CATEGORIES_KEY);
    this.categories.set(categories);
  }

  getCategories(): WritableSignal<Category[]> {
    return this.categories;
  }

  async addCategory(category: Omit<Category, 'id'>): Promise<void> {
    const categories = this.getStorageItem(this.CATEGORIES_KEY);
    const newCategory: Category = {
      ...category,
      id: categories.length > 0 ? Math.max(...categories.map((c: Category) => c.id)) + 1 : 1,
    };
    categories.push(newCategory);
    this.setStorageItem(this.CATEGORIES_KEY, categories);
    await this.loadCategories();
  }

  async deleteCategory(id: number): Promise<void> {
    const categories = this.getStorageItem(this.CATEGORIES_KEY);
    const filtered = categories.filter((c: Category) => c.id !== id);
    this.setStorageItem(this.CATEGORIES_KEY, filtered);
    await this.loadCategories();
  }

  async loadReminders(): Promise<void> {
    const reminders = this.getStorageItem(this.REMINDERS_KEY);
    const pending = reminders.filter((reminder: Reminder) => !reminder.payment_done);
    // Sort by datetime ascending
    pending.sort((a: Reminder, b: Reminder) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
    this.reminder.set(pending);
  }

  async loadRemindersPayed(): Promise<void> {
    const reminders = this.getStorageItem(this.REMINDERS_KEY);
    const payed = reminders.filter((reminder: Reminder) => reminder.payment_done);
    // Sort by datetime descending
    payed.sort((a: Reminder, b: Reminder) =>
      new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
    this.reminder_payed.set(payed);
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
    reminder.recurrence = reminder.recurrence || 'none';
    const updatedReminders = [reminder, ...this.getStorageItem(this.REMINDERS_KEY)];
    this.setStorageItem(this.REMINDERS_KEY, updatedReminders);
    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async updateReminder(reminder: Reminder): Promise<void> {
    const reminders = this.getStorageItem(this.REMINDERS_KEY);
    const updatedReminders = reminders.map((_reminder: Reminder) =>
      _reminder.id === reminder.id ? reminder : _reminder
    );
    this.setStorageItem(this.REMINDERS_KEY, updatedReminders);
    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async deleteReminder(id: number): Promise<void> {
    const reminders = this.getStorageItem(this.REMINDERS_KEY);
    const updatedReminders = reminders.filter((reminder: Reminder) => reminder.id !== id);
    this.setStorageItem(this.REMINDERS_KEY, updatedReminders);
    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async payReminder(reminder: Reminder): Promise<void> {
    reminder.payment_done = true;
    await this.updateReminder(reminder);
  }

  async getLastInsertId(): Promise<number> {
    const reminders = this.getStorageItem(this.REMINDERS_KEY);
    return reminders.reduce((maxId: number, reminder: Reminder) => Math.max(maxId, reminder.id), 0);
  }

  async exportData(): Promise<{ reminders: Reminder[]; categories: Category[] }> {
    return {
      reminders: this.getStorageItem(this.REMINDERS_KEY),
      categories: this.getStorageItem(this.CATEGORIES_KEY),
    };
  }

  async importData(data: { reminders: Reminder[]; categories: Category[] }): Promise<boolean> {
    try {
      this.setStorageItem(this.REMINDERS_KEY, data.reminders);
      this.setStorageItem(this.CATEGORIES_KEY, data.categories);
      await this.loadCategories();
      await this.loadReminders();
      await this.loadRemindersPayed();
      return true;
    } catch {
      return false;
    }
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