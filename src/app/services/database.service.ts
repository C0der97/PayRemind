import { Injectable, WritableSignal, signal } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_REMIND = 'reminders';

export interface Reminder {
  id: number;
  uuid?: string;
  name: string;
  value: number;
  date: Date;
  payment_done: boolean;
  reminder_time: string;
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

  public async createConnectionDB() {
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
        date TEXT NOT NULL,
        payment_done BOOLEAN DEFAULT 0,
        reminder_time TEXT
    );
    `;

    await this.db.execute(schema);

    return true;
  }

  async loadReminders() {
    const reminders = await this.db.query(
      'SELECT * FROM reminders where payment_done = false'
    );
    this.reminder.set(reminders.values || []);
  }

  async loadRemindersPayed() {
    const reminders_payed = await this.db.query(
      'SELECT * FROM reminders where payment_done = true'
    );
    this.reminder_payed.set(reminders_payed.values || []);
  }

  getReminders() {
    return this.reminder;
  }

  getRemindersPayed() {
    return this.reminder_payed;
  }

  async addReminder(reminder: Reminder) {
    reminder.payment_done = false;
    const { name, value, date, payment_done, reminder_time } = reminder;
    const result = await this.db.run(
      `INSERT INTO reminders (name, value, date, payment_done, reminder_time) VALUES (?, ?, ?, ?, ?)`,
      [name, value, date, payment_done, reminder_time]
    );

    this.loadReminders();
    return result;
  }

  async updateReminder(reminder: Reminder) {
    reminder.payment_done = false;
    const { id, name, value, date, payment_done, reminder_time } = reminder;
    const result = await this.db.run(
      `UPDATE reminders SET name = ?, value = ?, date = ?, payment_done = ?, reminder_time = ? WHERE id = ?`,
      [name, value, date, payment_done, reminder_time, id]
    );

    this.loadReminders();
    return result;
  }

  async deleteReminder(id: number) {
    const result = await this.db.run(`DELETE FROM reminders WHERE id = ?`, [
      id,
    ]);

    this.loadReminders();
    return result;
  }

  async payReminder(reminder: Reminder) {
    reminder.payment_done = true;
    const { id, payment_done } = reminder;
    const result = await this.db.run(
      `UPDATE reminders SET  payment_done = ? WHERE id = ?`,
      [payment_done, id]
    );

    this.loadReminders();
    return result;
  }

  async getLastInsertId() : Promise<number> {
    const result = await this.db.query('SELECT last_insert_rowid() as lastId');
    console.log('result lastinseted', result)
    if (result.values && result.values.length > 0) {
      return result.values[0].lastId;
    } else {
      return 0;
    }
  }
}
