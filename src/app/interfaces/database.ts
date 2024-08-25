import { WritableSignal } from '@angular/core';
import { Reminder } from "../services/database.service";

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
}