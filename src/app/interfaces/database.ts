import { Reminder } from "../services/database.service";

export abstract class PaymentReminderRepository {
  public abstract initializeConnnection(): void;
  public abstract loadReminders(): void;
  public abstract addReminder(reminder: Reminder): void;
  public abstract updateReminder(reminder: Reminder): void;
}
