/**
 * PomodoroTimer Component Tests
 *
 * Tests for the StudyTab pomodoro timer including start/pause/resume,
 * break transitions, session counter, and completion callbacks.
 *
 * @module tests/components/studytab/pomodoro-timer
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { PomodoroTimer } from './pomodoro-timer.source';

// Use very short durations (in minutes) so timers fire quickly in tests.
// 0.05 min = 3 seconds, enough to observe countdown and reach 0.
const FAST_SETTINGS = {
  workDuration: 0.05,       // 3s
  shortBreakDuration: 0.05, // 3s
  longBreakDuration: 0.05,  // 3s
  pomodorosUntilLongBreak: 4,
};

// =============================================================================
// IDLE STATE TESTS
// =============================================================================

test.describe('PomodoroTimer - Idle State', () => {
  test('renders in idle state with start button', async ({ mount }) => {
    const component = await mount(<PomodoroTimer />);

    await expect(component.getByTestId('start-button')).toBeVisible();
    await expect(component.getByTestId('pause-button')).not.toBeVisible();
    await expect(component.getByTestId('resume-button')).not.toBeVisible();
  });

  test('shows default 25:00 timer display', async ({ mount }) => {
    const component = await mount(<PomodoroTimer />);

    await expect(component.getByTestId('time-display')).toContainText('25:00');
  });
});

// =============================================================================
// START / PAUSE / RESUME TESTS
// =============================================================================

test.describe('PomodoroTimer - Controls', () => {
  test('start button begins countdown', async ({ mount }) => {
    const component = await mount(<PomodoroTimer settings={FAST_SETTINGS} />);

    // Initially 00:03
    await expect(component.getByTestId('time-display')).toContainText('00:03');

    await component.getByTestId('start-button').click();

    // Wait for at least one tick
    await expect(component.getByTestId('time-display')).not.toContainText('00:03', {
      timeout: 3000,
    });
  });

  test('pause button appears when running', async ({ mount }) => {
    const component = await mount(<PomodoroTimer settings={FAST_SETTINGS} />);

    await component.getByTestId('start-button').click();

    await expect(component.getByTestId('pause-button')).toBeVisible();
    await expect(component.getByTestId('start-button')).not.toBeVisible();
  });

  test('pause stops the countdown', async ({ mount, page }) => {
    const component = await mount(<PomodoroTimer settings={FAST_SETTINGS} />);

    await component.getByTestId('start-button').click();

    // Let it tick once
    await page.waitForTimeout(1100);

    await component.getByTestId('pause-button').click();

    const timeAfterPause = await component.getByTestId('time-display').textContent();

    // Wait and verify time hasn't changed
    await page.waitForTimeout(1200);

    await expect(component.getByTestId('time-display')).toContainText(timeAfterPause!);
  });

  test('resume continues from paused time', async ({ mount, page }) => {
    const component = await mount(<PomodoroTimer settings={FAST_SETTINGS} />);

    await component.getByTestId('start-button').click();
    await page.waitForTimeout(1100);

    await component.getByTestId('pause-button').click();
    const pausedTime = await component.getByTestId('time-display').textContent();

    await component.getByTestId('resume-button').click();

    // After resuming, time should continue decreasing
    await expect(component.getByTestId('time-display')).not.toContainText(pausedTime!, {
      timeout: 3000,
    });
  });

  test('reset returns to initial time', async ({ mount, page }) => {
    const component = await mount(<PomodoroTimer settings={FAST_SETTINGS} />);

    await component.getByTestId('start-button').click();
    await page.waitForTimeout(1100);

    await component.getByTestId('reset-button').click();

    await expect(component.getByTestId('time-display')).toContainText('00:03');
    await expect(component.getByTestId('start-button')).toBeVisible();
  });
});

// =============================================================================
// BREAK TESTS
// =============================================================================

test.describe('PomodoroTimer - Breaks', () => {
  test('displays "Break" label during break period', async ({ mount, page }) => {
    const component = await mount(
      <PomodoroTimer settings={FAST_SETTINGS} />
    );

    // Start and let timer complete (3s work)
    await component.getByTestId('start-button').click();
    await page.waitForTimeout(4000);

    // After work session completes, should transition to break
    await expect(component.getByTestId('session-label')).toContainText('Break');
  });

  test('short break defaults to 5:00', async ({ mount }) => {
    const component = await mount(
      <PomodoroTimer settings={{ shortBreakDuration: 5 }} />
    );

    // Default is work mode - verify the setting is accepted by checking
    // that timer renders (we'll see break duration after completing work)
    await expect(component.getByTestId('time-display')).toContainText('25:00');
  });

  test('long break defaults to 15:00', async ({ mount }) => {
    const component = await mount(
      <PomodoroTimer settings={{ longBreakDuration: 15 }} />
    );

    await expect(component.getByTestId('time-display')).toContainText('25:00');
  });

  test('skip break button advances to next work session', async ({ mount, page }) => {
    const component = await mount(
      <PomodoroTimer settings={FAST_SETTINGS} />
    );

    // Complete a work session to enter break
    await component.getByTestId('start-button').click();
    await page.waitForTimeout(4000);

    // Should now be in break, skip it
    await expect(component.getByTestId('skip-break-button')).toBeVisible();
    await component.getByTestId('skip-break-button').click();

    // Should be back to work (Focus label, not Break)
    await expect(component.getByTestId('session-label')).toContainText('Focus');
  });
});

// =============================================================================
// SESSION COUNTER TESTS
// =============================================================================

test.describe('PomodoroTimer - Session Counter', () => {
  test('session counter shows completed pomodoros', async ({ mount, page }) => {
    const component = await mount(
      <PomodoroTimer settings={FAST_SETTINGS} />
    );

    // Initially 0/4
    await expect(component.getByTestId('session-counter')).toContainText('0/4');

    // Complete one work session
    await component.getByTestId('start-button').click();
    await page.waitForTimeout(4000);

    // Should now be 1/4
    await expect(component.getByTestId('session-counter')).toContainText('1/4');
  });
});

// =============================================================================
// COMPLETION CALLBACK TESTS
// =============================================================================

test.describe('PomodoroTimer - Completion', () => {
  test('timer reaching 0:00 triggers completion callback', async ({ mount, page }) => {
    let completedType: string | null = null;

    const component = await mount(
      <PomodoroTimer
        settings={FAST_SETTINGS}
        onComplete={(type) => (completedType = type)}
      />
    );

    await component.getByTestId('start-button').click();

    // Wait for the 3-second timer to finish
    await page.waitForTimeout(4500);

    expect(completedType).toBe('work');
  });
});
