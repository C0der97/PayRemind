import { Injectable, WritableSignal, signal } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_REMIND = "reminders";


export interface Reminder{
  id: number,
  name: string,
  value: number,
  date: Date,
  payment_done: boolean,
  reminder_time: string
}


@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private sqlLite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private reminder: WritableSignal<Reminder[]> = signal<Reminder[]>([]);


  constructor() { }

  async initializeConnnection(){
    this.db = await this.sqlLite.createConnection(
      DB_REMIND,
      false,
      'no-encryption',
      1,
      false
    );

    await this.db.open();

    const schema = `
    
    DROP TABLE IF EXISTS reminders;
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

   this.loadReminders();
    
   return true;
  }

  async loadReminders(){
    const reminders = await this.db.query('SELECT * FROM reminders where payment_done = false');
    this.reminder.set(reminders.values || []);
  }

  getReminders(){
    return this.reminder;
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
    const result = await this.db.run(
      `DELETE FROM reminders WHERE id = ?`,
      [id]
    );

      this.loadReminders();
      return result;

  }
}
