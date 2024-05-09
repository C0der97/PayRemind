import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_REMIND = "reminders";


export interface Reminder{
  id: number,
  name: string,
  value: number,
  date: Date
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

    const schema = `CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value INTEGER NOT NULL,
      date TEXT NOT NULL
  );
  `;

   await this.db.execute(schema);

   this.loadReminders();
    
   return true;
  }

  async loadReminders(){
    const reminders = await this.db.query('SELECT * FROM reminders');
    this.reminder.set(reminders.values || []);
  }

  getReminders(){
    return this.reminder;
  }


  async addReminder(reminder: Reminder) {
    const { name, value, date } = reminder;
    const result = await this.db.run(
      `INSERT INTO reminders (name, value, date) VALUES (?, ?, ?)`,
      [name, value, date]
    );

      this.loadReminders();
      return result;
  }

  async updateReminder(reminder: Reminder) {
    const { id, name, value, date } = reminder;
    const result = await this.db.run(
      `UPDATE reminders SET name = ?, value = ?, date = ? WHERE id = ?`,
      [name, value, date, id]
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
