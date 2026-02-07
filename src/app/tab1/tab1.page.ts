import { Component, OnInit } from '@angular/core';
import { Reminder, Category } from '../services/database.service';
import { AlertController, ToastController } from '@ionic/angular';
import {
  CancelOptions,
  LocalNotifications,
  ScheduleOptions,
} from '@capacitor/local-notifications';
import { MediatorStorageService } from '../services/mediator-storage.service';
import { SettingsService } from '../services/settings.service';
import { WritableSignal } from '@angular/core';
import * as moment from 'moment-timezone';

type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Sin repetición' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page implements OnInit {
  reminders: WritableSignal<Reminder[]>;
  categories: WritableSignal<Category[]>;

  // Filters
  selectedCategoryId: number | null = null;
  sortBy: 'date' | 'value' | 'name' = 'date';
  sortOrder: 'asc' | 'desc' = 'asc';

  constructor(
    private database: MediatorStorageService,
    private settingsService: SettingsService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    this.reminders = this.database.getReminders();
    this.categories = this.database.getCategories();
  }

  get timeZone(): string {
    return this.settingsService.getTimeZone();
  }

  get currencyCode(): string {
    return this.settingsService.getCurrency();
  }

  ngOnInit() {
    moment.tz.setDefault(this.timeZone);
  }

  ionViewWillEnter() {
    this.loadReminders();
    this.loadCategories();
  }

  private async loadReminders() {
    await this.database.loadReminders();
  }

  private async loadCategories() {
    await this.database.loadCategories();
  }

  get filteredReminders(): Reminder[] {
    let list = [...this.reminders()];

    // Filter by category
    if (this.selectedCategoryId !== null) {
      list = list.filter(r => r.categoryId === this.selectedCategoryId);
    }

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      switch (this.sortBy) {
        case 'date':
          comparison = new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }

  clearFilter() {
    this.selectedCategoryId = null;
  }

  filterByCategory(categoryId: number) {
    this.selectedCategoryId = categoryId;
  }

  toggleSort(field: 'date' | 'value' | 'name') {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
  }

  onSortChange(event: any) {
    const value = event.detail.value;
    this.toggleSort(value);
  }

  async showFilterOptions() {
    const categoriesList = this.categories();

    const alert = await this.alertController.create({
      header: 'Filtrar por categoría',
      inputs: [
        {
          name: 'category',
          type: 'radio',
          label: 'Todas las categorías',
          value: 'all',
          checked: this.selectedCategoryId === null,
        },
        ...categoriesList.map(cat => ({
          name: 'category',
          type: 'radio' as const,
          label: cat.name,
          value: cat.id.toString(),
          checked: this.selectedCategoryId === cat.id,
        })),
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Aplicar',
          handler: (value) => {
            if (value === 'all') {
              this.selectedCategoryId = null;
            } else {
              this.selectedCategoryId = parseInt(value);
            }
          },
        },
      ],
    });

    await alert.present();
  }

  getDaysUntilDue(datetime: string): number {
    const now = moment().tz(this.timeZone);
    const due = moment(datetime).tz(this.timeZone);
    return due.diff(now, 'days');
  }

  getDueBadge(datetime: string): { text: string; color: string } | null {
    const days = this.getDaysUntilDue(datetime);
    if (days < 0) {
      return { text: 'Vencido', color: 'danger' };
    } else if (days === 0) {
      return { text: 'Hoy', color: 'warning' };
    } else if (days === 1) {
      return { text: 'Mañana', color: 'tertiary' };
    } else if (days <= 3) {
      return { text: `En ${days} días`, color: 'primary' };
    }
    return null;
  }

  getRecurrenceLabel(recurrence?: string): string {
    const option = RECURRENCE_OPTIONS.find(o => o.value === recurrence);
    return option?.label || '';
  }

  getCategoryById(categoryId?: number): Category | undefined {
    if (!categoryId) return undefined;
    return this.categories().find(c => c.id === categoryId);
  }

  async addNewReminder() {
    const alert = await this.createReminderAlert('Nuevo Recordatorio');
    await alert.present();
  }

  async editReminder(reminder: Reminder) {
    const alert = await this.createReminderAlert('Editar Recordatorio', reminder);
    await alert.present();
  }

  private splitDateTime(datetime: string): [string, string] {
    const date = moment(datetime).tz(this.timeZone);
    return [date.format('YYYY-MM-DD'), date.format('HH:mm')];
  }

  private async createReminderAlert(header: string, reminder?: Reminder) {
    const [dateValue, timeValue] = reminder ? this.splitDateTime(reminder.datetime) : ['', ''];
    const categoriesList = this.categories();

    return this.alertController.create({
      header,
      cssClass: 'reminder-alert',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre del pago',
          value: reminder?.name || '',
        },
        {
          name: 'value',
          type: 'number',
          placeholder: 'Valor a pagar',
          value: reminder?.value || '',
        },
        {
          name: 'date',
          type: 'date',
          placeholder: 'Fecha',
          value: dateValue,
        },
        {
          name: 'time',
          type: 'time',
          placeholder: 'Hora',
          value: timeValue,
        },
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Notas (opcional)',
          value: reminder?.notes || '',
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Siguiente',
          handler: async (data) => {
            console.log('Form data received:', data);
            if (this.validateReminderData(data)) {
              await this.showCategoryAndRecurrenceSelector(data, reminder);
              return true;
            }
            console.log('Validation failed:', { name: data.name, value: data.value, date: data.date, time: data.time });
            this.showToast('Por favor complete todos los campos requeridos', 'warning');
            return false;
          },
        },
      ],
    });
  }

  private async showCategoryAndRecurrenceSelector(
    basicData: { name: string; value: string; date: string; time: string; notes: string },
    existingReminder?: Reminder
  ) {
    const categoriesList = this.categories();

    const alert = await this.alertController.create({
      header: 'Categoría y Repetición',
      inputs: [
        ...categoriesList.map((cat, index) => ({
          name: 'category',
          type: 'radio' as const,
          label: cat.name,
          value: cat.id.toString(),
          checked: existingReminder?.categoryId === cat.id || (index === 0 && !existingReminder?.categoryId),
        })),
      ],
      buttons: [
        {
          text: 'Atrás',
          role: 'cancel',
        },
        {
          text: 'Siguiente',
          handler: async (categoryId) => {
            await this.showRecurrenceSelector(basicData, parseInt(categoryId), existingReminder);
          },
        },
      ],
    });

    await alert.present();
  }

  private async showRecurrenceSelector(
    basicData: { name: string; value: string; date: string; time: string; notes: string },
    categoryId: number,
    existingReminder?: Reminder
  ) {
    const alert = await this.alertController.create({
      header: 'Repetición',
      inputs: RECURRENCE_OPTIONS.map((opt, index) => ({
        name: 'recurrence',
        type: 'radio' as const,
        label: opt.label,
        value: opt.value,
        checked: existingReminder?.recurrence === opt.value || (index === 0 && !existingReminder?.recurrence),
      })),
      buttons: [
        {
          text: 'Atrás',
          role: 'cancel',
        },
        {
          text: 'Guardar',
          handler: async (recurrence: RecurrenceType) => {
            const newReminder = this.createReminderFromData(basicData, categoryId, recurrence, existingReminder);
            await this.saveReminder(newReminder, !!existingReminder);
          },
        },
      ],
    });

    await alert.present();
  }

  private validateReminderData(data: { name: string; value: string; date: string; time: string }): boolean {
    // Ensure all required fields have values
    const hasName = Boolean(data.name && data.name.trim().length > 0);
    const hasValue = data.value !== undefined && data.value !== null && data.value !== '';
    const hasDate = Boolean(data.date && data.date.trim().length > 0);
    const hasTime = Boolean(data.time && data.time.trim().length > 0);

    console.log('Validation check:', { hasName, hasValue, hasDate, hasTime });
    return hasName && hasValue && hasDate && hasTime;
  }

  private createReminderFromData(
    data: { name: string; value: string; date: string; time: string; notes: string },
    categoryId: number,
    recurrence: RecurrenceType,
    existingReminder?: Reminder
  ): Reminder {
    return {
      ...(existingReminder || {}),
      name: data.name,
      value: Number(data.value),
      datetime: this.combineDateAndTime(data.date, data.time),
      id: existingReminder?.id || 0,
      payment_done: false,
      categoryId,
      recurrence,
      notes: data.notes || undefined,
    };
  }

  private combineDateAndTime(date: string, time: string): string {
    return moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', this.timeZone).format();
  }

  private async saveReminder(reminder: Reminder, isEdit: boolean) {
    try {
      if (isEdit) {
        await this.cancelNotificationById(reminder.id);
        await this.database.updateReminder(reminder);
      } else {
        await this.database.addReminder(reminder);
        reminder.id = await this.database.getLastInsertId();
      }
      await this.scheduleLocalNotification(reminder);
      await this.loadReminders();
      this.showToast(isEdit ? 'Recordatorio actualizado' : 'Recordatorio creado', 'success');
    } catch (error) {
      console.error('Error saving reminder:', error);
      this.showToast('Error al guardar el recordatorio', 'danger');
    }
  }

  async deleteReminder(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Confirmar Borrado',
      message: '¿Está seguro de eliminar este recordatorio?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Borrar',
          cssClass: 'danger',
          handler: async () => {
            await this.cancelNotificationById(reminder.id);
            await this.database.deleteReminder(reminder.id);
            await this.loadReminders();
            this.showToast('Recordatorio eliminado', 'success');
          },
        },
      ],
    });

    await alert.present();
  }

  async payReminder(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Confirmar Pago',
      message: '¿Está seguro de marcar este recordatorio como pagado?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Pagar',
          handler: async () => {
            await this.cancelNotificationById(reminder.id);
            await this.database.payReminder(reminder);

            // If recurring, create next occurrence
            if (reminder.recurrence && reminder.recurrence !== 'none') {
              await this.createNextRecurrence(reminder);
            }

            await this.loadReminders();
            this.showToast('Pago registrado', 'success');
          },
        },
      ],
    });

    await alert.present();
  }

  private async createNextRecurrence(reminder: Reminder): Promise<void> {
    const newDate = this.getNextRecurrenceDate(reminder.datetime, reminder.recurrence!);
    const newReminder: Reminder = {
      ...reminder,
      id: 0,
      datetime: newDate,
      uuid: undefined,
      payment_done: false,
    };
    await this.database.addReminder(newReminder);
    newReminder.id = await this.database.getLastInsertId();
    await this.scheduleLocalNotification(newReminder);
  }

  private getNextRecurrenceDate(currentDate: string, recurrence: string): string {
    const current = moment(currentDate).tz(this.timeZone);
    switch (recurrence) {
      case 'weekly':
        return current.add(1, 'week').format();
      case 'biweekly':
        return current.add(2, 'weeks').format();
      case 'monthly':
        return current.add(1, 'month').format();
      case 'yearly':
        return current.add(1, 'year').format();
      default:
        return current.format();
    }
  }

  private async scheduleLocalNotification(reminder: Reminder) {
    const settings = this.settingsService.getCurrentSettings();
    const reminderTime = moment(reminder.datetime).tz(this.timeZone);

    // Schedule main notification
    const notifications = [
      {
        id: reminder.id,
        title: 'Recuerda pagar',
        body: `Pago de: ${reminder.name}`,
        largeBody: `Pago de ${reminder.name} por valor ${reminder.value}`,
        summaryText: `Recuerda pagar tu ${reminder.name}`,
        schedule: { at: reminderTime.toDate() },
      },
    ];

    // Schedule advance notification if configured
    if (settings.notifyDaysBefore > 0) {
      const advanceTime = reminderTime.clone().subtract(settings.notifyDaysBefore, 'days');
      if (advanceTime.isAfter(moment())) {
        notifications.push({
          id: reminder.id + 100000, // Offset ID to avoid collision
          title: `Pago próximo (en ${settings.notifyDaysBefore} día${settings.notifyDaysBefore > 1 ? 's' : ''})`,
          body: `${reminder.name}: ${reminder.value}`,
          largeBody: `Recuerda: Tienes un pago de ${reminder.name} en ${settings.notifyDaysBefore} día(s)`,
          summaryText: `Próximo pago: ${reminder.name}`,
          schedule: { at: advanceTime.toDate() },
        });
      }
    }

    const options: ScheduleOptions = { notifications };

    try {
      await LocalNotifications.schedule(options);
    } catch (ex) {
      console.error('Error al programar la notificación:', ex);
    }
  }

  private async cancelNotificationById(notificationId: number) {
    const options: CancelOptions = {
      notifications: [
        { id: notificationId },
        { id: notificationId + 100000 }, // Also cancel advance notification
      ],
    };

    try {
      await LocalNotifications.cancel(options);
    } catch (err) {
      console.error('Error canceling notification:', err);
    }
  }

  async rescheduleNotification(reminder: Reminder) {
    const alert = await this.alertController.create({
      header: 'Reprogramar Recordatorio',
      message: '¿Desea marcar este recordatorio como pagado y crear uno nuevo para el próximo período?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Reprogramar',
          handler: async () => {
            await this.cancelNotificationById(reminder.id);
            await this.database.payReminder(reminder);

            const recurrence = reminder.recurrence || 'monthly';
            const newDate = this.getNextRecurrenceDate(reminder.datetime, recurrence);
            const newReminder: Reminder = {
              ...reminder,
              id: 0,
              datetime: newDate,
              uuid: undefined,
              payment_done: false,
            };
            await this.database.addReminder(newReminder);
            newReminder.id = await this.database.getLastInsertId();
            await this.scheduleLocalNotification(newReminder);
            await this.loadReminders();
            this.showToast('Recordatorio reprogramado', 'success');
          },
        },
      ],
    });

    await alert.present();
  }

  formatTimeWithAMPM(datetime: string): string {
    return moment(datetime).tz(this.timeZone).format('hh:mm A');
  }

  formatDate(datetime: string): string {
    return moment(datetime).tz(this.timeZone).format('DD/MM/YYYY');
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}