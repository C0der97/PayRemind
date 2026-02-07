import { Injectable, WritableSignal, signal } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_REMIND = 'reminders';

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Reminder {
  id: number;
  uuid?: string;
  name: string;
  value: number;
  datetime: string;
  payment_done: boolean;
  categoryId?: number;
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  notes?: string;
}

export interface DatabaseError {
  message: string;
  operation: string;
  originalError?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private sqlLite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private reminder: WritableSignal<Reminder[]> = signal<Reminder[]>([]);
  private reminder_payed: WritableSignal<Reminder[]> = signal<Reminder[]>([]);
  private categories: WritableSignal<Category[]> = signal<Category[]>([]);
  private lastError: WritableSignal<DatabaseError | null> = signal<DatabaseError | null>(null);

  constructor() { }

  getLastError(): WritableSignal<DatabaseError | null> {
    return this.lastError;
  }

  private handleError(operation: string, error: unknown): void {
    const dbError: DatabaseError = {
      message: error instanceof Error ? error.message : 'Error desconocido',
      operation,
      originalError: error,
    };
    this.lastError.set(dbError);
    console.error(`[DatabaseService] Error in ${operation}:`, error);
  }

  private clearError(): void {
    this.lastError.set(null);
  }

  public async initializeConnection(): Promise<boolean> {
    try {
      this.clearError();
      this.db = await this.sqlLite.createConnection(
        DB_REMIND,
        false,
        'no-encryption',
        2, // Incremented version for migration
        false
      );

      await this.db.open();

      // Main reminders table with new columns
      const schema = `
        CREATE TABLE IF NOT EXISTS reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER NOT NULL,
          datetime TEXT NOT NULL,
          payment_done INTEGER DEFAULT 0,
          category_id INTEGER,
          recurrence TEXT DEFAULT 'none',
          notes TEXT
        );
      `;

      // Categories table
      const categoriesSchema = `
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT DEFAULT 'pricetag-outline',
          color TEXT DEFAULT '#4bfed4'
        );
      `;

      await this.db.execute(schema);
      await this.db.execute(categoriesSchema);

      // Insert default categories if none exist
      await this.initializeDefaultCategories();

      return true;
    } catch (error) {
      this.handleError('createConnectionDB', error);
      return false;
    }
  }

  private async initializeDefaultCategories(): Promise<void> {
    try {
      const existing = await this.db.query('SELECT COUNT(*) as count FROM categories');
      if (existing.values && existing.values[0]?.count === 0) {
        const defaultCategories = [
          { name: 'Servicios', icon: 'flash-outline', color: '#ffd534' },
          { name: 'Tarjetas', icon: 'card-outline', color: '#5260ff' },
          { name: 'Préstamos', icon: 'cash-outline', color: '#eb445a' },
          { name: 'Suscripciones', icon: 'calendar-outline', color: '#3dc2ff' },
          { name: 'Otros', icon: 'pricetag-outline', color: '#92949c' },
        ];

        for (const cat of defaultCategories) {
          await this.db.run(
            'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
            [cat.name, cat.icon, cat.color]
          );
        }
      }
    } catch (error) {
      this.handleError('initializeDefaultCategories', error);
    }
  }

  async loadCategories(): Promise<void> {
    try {
      this.clearError();
      const result = await this.db.query('SELECT * FROM categories ORDER BY name');
      this.categories.set(result.values || []);
    } catch (error) {
      this.handleError('loadCategories', error);
    }
  }

  getCategories(): WritableSignal<Category[]> {
    return this.categories;
  }

  async addCategory(category: Omit<Category, 'id'>): Promise<void> {
    try {
      this.clearError();
      await this.db.run(
        'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
        [category.name, category.icon, category.color]
      );
      await this.loadCategories();
    } catch (error) {
      this.handleError('addCategory', error);
    }
  }

  async deleteCategory(id: number): Promise<void> {
    try {
      this.clearError();
      await this.db.run('DELETE FROM categories WHERE id = ?', [id]);
      await this.loadCategories();
    } catch (error) {
      this.handleError('deleteCategory', error);
    }
  }

  async loadReminders(): Promise<void> {
    try {
      this.clearError();
      const reminders = await this.db.query(
        `SELECT r.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor 
         FROM reminders r 
         LEFT JOIN categories c ON r.category_id = c.id 
         WHERE r.payment_done = 0 
         ORDER BY r.datetime ASC`
      );
      this.reminder.set(reminders.values || []);
    } catch (error) {
      this.handleError('loadReminders', error);
    }
  }

  async loadRemindersPayed(): Promise<void> {
    try {
      this.clearError();
      const reminders_payed = await this.db.query(
        `SELECT r.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor 
         FROM reminders r 
         LEFT JOIN categories c ON r.category_id = c.id 
         WHERE r.payment_done = 1 
         ORDER BY r.datetime DESC`
      );
      this.reminder_payed.set(reminders_payed.values || []);
    } catch (error) {
      this.handleError('loadRemindersPayed', error);
    }
  }

  getReminders(): WritableSignal<Reminder[]> {
    return this.reminder;
  }

  getRemindersPayed(): WritableSignal<Reminder[]> {
    return this.reminder_payed;
  }

  async addReminder(reminder: Reminder): Promise<void> {
    try {
      this.clearError();
      const { name, value, datetime, payment_done, categoryId, recurrence, notes } = reminder;
      await this.db.run(
        `INSERT INTO reminders (name, value, datetime, payment_done, category_id, recurrence, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, value, datetime, payment_done ? 1 : 0, categoryId || null, recurrence || 'none', notes || null]
      );
      await this.loadReminders();
      await this.loadRemindersPayed();
    } catch (error) {
      this.handleError('addReminder', error);
    }
  }

  async updateReminder(reminder: Reminder): Promise<void> {
    try {
      this.clearError();
      const { id, name, value, datetime, payment_done, categoryId, recurrence, notes } = reminder;
      await this.db.run(
        `UPDATE reminders SET name = ?, value = ?, datetime = ?, payment_done = ?, 
         category_id = ?, recurrence = ?, notes = ? WHERE id = ?`,
        [name, value, datetime, payment_done ? 1 : 0, categoryId || null, recurrence || 'none', notes || null, id]
      );
      await this.loadReminders();
      await this.loadRemindersPayed();
    } catch (error) {
      this.handleError('updateReminder', error);
    }
  }

  async deleteReminder(id: number): Promise<void> {
    try {
      this.clearError();
      await this.db.run('DELETE FROM reminders WHERE id = ?', [id]);
      await this.loadReminders();
      await this.loadRemindersPayed();
    } catch (error) {
      this.handleError('deleteReminder', error);
    }
  }

  async payReminder(reminder: Reminder): Promise<void> {
    try {
      this.clearError();
      const { id } = reminder;
      await this.db.run(
        'UPDATE reminders SET payment_done = 1 WHERE id = ?',
        [id]
      );
      await this.loadReminders();
      await this.loadRemindersPayed();
    } catch (error) {
      this.handleError('payReminder', error);
    }
  }

  async getLastInsertId(): Promise<number> {
    try {
      this.clearError();
      const result = await this.db.query('SELECT last_insert_rowid() as lastId');
      if (result.values && result.values.length > 0) {
        return result.values[0].lastId;
      }
      return 0;
    } catch (error) {
      this.handleError('getLastInsertId', error);
      return 0;
    }
  }

  async exportData(): Promise<{ reminders: Reminder[]; categories: Category[] }> {
    try {
      this.clearError();
      const reminders = await this.db.query('SELECT * FROM reminders');
      const categories = await this.db.query('SELECT * FROM categories');
      return {
        reminders: reminders.values || [],
        categories: categories.values || [],
      };
    } catch (error) {
      this.handleError('exportData', error);
      return { reminders: [], categories: [] };
    }
  }

  async importData(data: { reminders: Reminder[]; categories: Category[] }): Promise<boolean> {
    try {
      this.clearError();
      // Clear existing data
      await this.db.run('DELETE FROM reminders');
      await this.db.run('DELETE FROM categories');

      // Import categories
      for (const cat of data.categories) {
        await this.db.run(
          'INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
          [cat.id, cat.name, cat.icon, cat.color]
        );
      }

      // Import reminders
      for (const rem of data.reminders) {
        await this.db.run(
          `INSERT INTO reminders (id, name, value, datetime, payment_done, category_id, recurrence, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [rem.id, rem.name, rem.value, rem.datetime, rem.payment_done ? 1 : 0,
          rem.categoryId || null, rem.recurrence || 'none', rem.notes || null]
        );
      }

      await this.loadCategories();
      await this.loadReminders();
      await this.loadRemindersPayed();
      return true;
    } catch (error) {
      this.handleError('importData', error);
      return false;
    }
  }
}