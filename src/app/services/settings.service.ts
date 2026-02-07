import { Injectable, WritableSignal, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { UserSettings, DEFAULT_SETTINGS } from '../interfaces/settings.interface';

const SETTINGS_KEY = 'user_settings';

@Injectable({
    providedIn: 'root',
})
export class SettingsService {
    private settings: WritableSignal<UserSettings> = signal<UserSettings>(DEFAULT_SETTINGS);
    private readonly isNative: boolean;

    constructor() {
        this.isNative = Capacitor.isNativePlatform();
        this.loadSettings();
    }

    private async loadSettings(): Promise<void> {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle new settings added in updates
                this.settings.set({ ...DEFAULT_SETTINGS, ...parsed });
            }
        } catch (error) {
            console.error('[SettingsService] Error loading settings:', error);
            this.settings.set(DEFAULT_SETTINGS);
        }
    }

    getSettings(): WritableSignal<UserSettings> {
        return this.settings;
    }

    getCurrentSettings(): UserSettings {
        return this.settings();
    }

    async updateSettings(newSettings: Partial<UserSettings>): Promise<void> {
        const current = this.settings();
        const updated = { ...current, ...newSettings };
        this.settings.set(updated);
        await this.saveSettings(updated);
    }

    private async saveSettings(settings: UserSettings): Promise<void> {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('[SettingsService] Error saving settings:', error);
        }
    }

    async resetSettings(): Promise<void> {
        this.settings.set(DEFAULT_SETTINGS);
        await this.saveSettings(DEFAULT_SETTINGS);
    }

    // Helper methods for common settings
    getTimeZone(): string {
        return this.settings().timeZone;
    }

    getCurrency(): string {
        return this.settings().currency;
    }

    getCurrencySymbol(): string {
        return this.settings().currencySymbol;
    }

    getTheme(): 'light' | 'dark' | 'system' {
        return this.settings().theme;
    }

    async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
        await this.updateSettings({ theme });
        this.applyTheme(theme);
    }

    applyTheme(theme: 'light' | 'dark' | 'system'): void {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else if (theme === 'light') {
            document.body.classList.remove('dark');
        } else {
            // System preference
            if (prefersDark.matches) {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        }
    }
}
