export interface UserSettings {
    timeZone: string;
    currency: string;
    currencySymbol: string;
    notifyDaysBefore: number;
    theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_SETTINGS: UserSettings = {
    timeZone: 'America/Bogota',
    currency: 'USD',
    currencySymbol: '$',
    notifyDaysBefore: 1,
    theme: 'system',
};

export const AVAILABLE_CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'Dólar estadounidense' },
    { code: 'COP', symbol: '$', name: 'Peso colombiano' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
    { code: 'ARS', symbol: '$', name: 'Peso argentino' },
    { code: 'CLP', symbol: '$', name: 'Peso chileno' },
    { code: 'PEN', symbol: 'S/', name: 'Sol peruano' },
    { code: 'BRL', symbol: 'R$', name: 'Real brasileño' },
];

export const AVAILABLE_TIMEZONES = [
    { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
    { value: 'America/Mexico_City', label: 'México (GMT-6)' },
    { value: 'America/Lima', label: 'Perú (GMT-5)' },
    { value: 'America/Buenos_Aires', label: 'Argentina (GMT-3)' },
    { value: 'America/Santiago', label: 'Chile (GMT-4)' },
    { value: 'America/Sao_Paulo', label: 'Brasil (GMT-3)' },
    { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
    { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
    { value: 'Europe/Madrid', label: 'España (GMT+1)' },
];
