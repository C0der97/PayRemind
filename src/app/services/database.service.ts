import { Injectable, WritableSignal, signal } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
  capSQLiteChanges
} from '@capacitor-community/sqlite';

const DB_REMIND = 'reminders';

export interface Reminder {
  id: number;
  uuid?: string;
  name: string;
  value: number;
  datetime: string;
  payment_done: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private sqlLite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private reminder: WritableSignal<Reminder[]> = signal<Reminder[]>([]);
  private reminder_payed: WritableSignal<Reminder[]> = signal<Reminder[]>([]);

  constructor() {}

  public async createConnectionDB(): Promise<boolean> {
    this.db = await this.sqlLite.createConnection(
      DB_REMIND,
      false,
      'no-encryption',
      1,
      false
    );

    await this.db.open();

    const schema = `
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value INTEGER NOT NULL,
        datetime TEXT NOT NULL,
        payment_done INTEGER DEFAULT 0
    );
    `;

    await this.db.execute(schema);

    return true;
  }

  async loadReminders(): Promise<void> {
    const reminders = await this.db.query('SELECT * FROM reminders WHERE payment_done = 0');
    this.reminder.set(reminders.values || []);
  }

  async loadRemindersPayed(): Promise<void> {
    const reminders_payed = await this.db.query('SELECT * FROM reminders WHERE payment_done = 1');
    this.reminder_payed.set(reminders_payed.values || []);
  }

  getReminders(): WritableSignal<Reminder[]> {
    return this.reminder;
  }

  getRemindersPayed(): WritableSignal<Reminder[]> {
    return this.reminder_payed;
  }

  async addReminder(reminder: Reminder): Promise<void> {
    const { name, value, datetime, payment_done } = reminder;
    await this.db.run(
      `INSERT INTO reminders (name, value, datetime, payment_done) VALUES (?, ?, ?, ?)`,
      [name, value, datetime, payment_done ? 1 : 0]
    );

    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async updateReminder(reminder: Reminder): Promise<void> {
    const { id, name, value, datetime, payment_done } = reminder;
    await this.db.run(
      `UPDATE reminders SET name = ?, value = ?, datetime = ?, payment_done = ? WHERE id = ?`,
      [name, value, datetime, payment_done ? 1 : 0, id]
    );

    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async deleteReminder(id: number): Promise<void> {
    await this.db.run(`DELETE FROM reminders WHERE id = ?`, [id]);

    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async payReminder(reminder: Reminder): Promise<void> {
    const { id } = reminder;
    await this.db.run(
      `UPDATE reminders SET payment_done = 1 WHERE id = ?`,
      [id]
    );

    await this.loadReminders();
    await this.loadRemindersPayed();
  }

  async getLastInsertId(): Promise<number> {
    const result = await this.db.query('SELECT last_insert_rowid() as lastId');
    if (result.values && result.values.length > 0) {
      return result.values[0].lastId;
    } else {
      return 0;
    }
  }
}