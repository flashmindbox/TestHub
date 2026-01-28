// Auth pages
export { LoginPage } from './login.page';
export { RegisterPage } from './register.page';
export { ForgotPasswordPage } from './forgot-password.page';

// Main app pages
export { DashboardPage } from './dashboard.page';
export { DecksPage } from './decks.page';
export { DeckDetailPage } from './deck-detail.page';
export { StudyPage } from './study.page';
export { SettingsPage } from './settings.page';
export { SchedulerSettingsPage } from './scheduler-settings.page';
export { ProfilePage } from './profile.page';
export { PomodoroPage } from './pomodoro.page';

// Components
export { AIGenerationComponent } from './ai-generation.component';

// Factory function to create all page objects
import { Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { RegisterPage } from './register.page';
import { ForgotPasswordPage } from './forgot-password.page';
import { DashboardPage } from './dashboard.page';
import { DecksPage } from './decks.page';
import { DeckDetailPage } from './deck-detail.page';
import { StudyPage } from './study.page';
import { SettingsPage } from './settings.page';
import { SchedulerSettingsPage } from './scheduler-settings.page';
import { ProfilePage } from './profile.page';
import { PomodoroPage } from './pomodoro.page';

export function createStudyTabPages(page: Page, baseUrl: string) {
  return {
    login: new LoginPage(page, baseUrl),
    register: new RegisterPage(page, baseUrl),
    forgotPassword: new ForgotPasswordPage(page, baseUrl),
    dashboard: new DashboardPage(page, baseUrl),
    decks: new DecksPage(page, baseUrl),
    deckDetail: new DeckDetailPage(page, baseUrl),
    study: new StudyPage(page, baseUrl),
    settings: new SettingsPage(page, baseUrl),
    schedulerSettings: new SchedulerSettingsPage(page, baseUrl),
    profile: new ProfilePage(page, baseUrl),
    pomodoro: new PomodoroPage(page, baseUrl),
  };
}

export type StudyTabPages = ReturnType<typeof createStudyTabPages>;
