import { WritableSignal } from '@angular/core';
import { Reminder, Category } from '../services/database.service';

export abstract class PaymentReminderRepository {
  public abstract initializeConnection(): Promise<boolean>;
  public abstract loadReminders(): Promise<void>;
  public abstract loadRemindersPayed(): Promise<void>;
  public abstract getReminders(): WritableSignal<Reminder[]>;
  public abstract getRemindersPayed(): WritableSignal<Reminder[]>;
  public abstract addReminder(reminder: Reminder): Promise<void>;
  public abstract updateReminder(reminder: Reminder): Promise<void>;
  public abstract deleteReminder(id: number): Promise<void>;
  public abstract payReminder(reminder: Reminder): Promise<void>;
  public abstract getLastInsertId(): Promise<number>;
  // New methods
  public abstract loadCategories(): Promise<void>;
  public abstract getCategories(): WritableSignal<Category[]>;
  public abstract addCategory(category: Omit<Category, 'id'>): Promise<void>;
  public abstract deleteCategory(id: number): Promise<void>;
  public abstract exportData(): Promise<{ reminders: Reminder[]; categories: Category[] }>;
  public abstract importData(data: { reminders: Reminder[]; categories: Category[] }): Promise<boolean>;
}