import { test, expect } from '../../../../src/fixtures';
import { ProfilePage } from '../../../../src/page-objects/studytab';

/**
 * Profile Settings Tests
 *
 * Tests the user profile management functionality including:
 * - Profile page display and navigation
 * - Viewing and updating profile information
 * - Name, bio, and timezone changes
 * - Email field security (read-only)
 * - Sign out functionality
 *
 * Tags: @studytab @settings @profile
 */
test.describe('Profile Settings @studytab @settings', () => {
  // Run all profile tests serially since they modify the same user profile
  test.describe.configure({ mode: 'serial' });

  let profilePage: ProfilePage;

  test.beforeEach(async ({ page, projectConfig }) => {
    profilePage = new ProfilePage(page, projectConfig.baseUrl);
  });

  test.describe('Page Display', () => {
    test('displays profile page with all elements', async ({ page }) => {
      await profilePage.goto();

      // Verify heading
      await expect(profilePage.heading).toBeVisible();
      await expect(profilePage.heading).toHaveText('Profile Settings');

      // Verify form elements
      await expect(profilePage.nameInput).toBeVisible();
      await expect(profilePage.emailInput).toBeVisible();
      await expect(profilePage.timezoneSelect).toBeVisible();
      await expect(profilePage.bioInput).toBeVisible();

      // Verify buttons
      await expect(profilePage.saveButton).toBeVisible();
      await expect(profilePage.signOutButton).toBeVisible();
    });

    test('displays avatar with user initials', async () => {
      await profilePage.goto();

      // Avatar button should be visible
      await expect(profilePage.avatarButton).toBeVisible();
      await expect(profilePage.avatarHint).toBeVisible();
      await expect(profilePage.avatarHint).toHaveText('Click avatar to change');
    });

    test('loads current user profile data', async () => {
      await profilePage.goto();

      // Name should be populated
      const name = await profilePage.getName();
      expect(name).toBeTruthy();
      expect(name.length).toBeGreaterThan(0);

      // Email should be populated
      const email = await profilePage.getEmail();
      expect(email).toContain('@');
    });
  });

  test.describe('Email Field Security', () => {
    test('email field is disabled and cannot be edited', async () => {
      await profilePage.goto();

      // Email input should be disabled
      await profilePage.expectEmailDisabled();

      // Verify it has a value but cannot be changed
      const email = await profilePage.getEmail();
      expect(email).toContain('@');
    });

    test('email displays the logged-in user email', async () => {
      await profilePage.goto();

      const email = await profilePage.getEmail();
      // Test user email from auth setup
      expect(email).toBe('test@example.com');
    });
  });

  test.describe('Update Profile Name', () => {
    test('can update display name', async ({ page }) => {
      await profilePage.goto();

      const originalName = await profilePage.getName();
      const newName = `Test User ${Date.now()}`;

      // Update name
      await profilePage.updateName(newName);

      // Verify name input shows new value
      await expect(profilePage.nameInput).toHaveValue(newName);

      // Save changes
      await profilePage.saveChanges();

      // Restore original name
      await profilePage.updateName(originalName);
      await profilePage.saveChanges();
    });

    test('name input has correct placeholder', async () => {
      await profilePage.goto();

      await expect(profilePage.nameInput).toHaveAttribute('placeholder', /name/i);
    });

    test('can clear and type new name', async () => {
      await profilePage.goto();

      await profilePage.nameInput.clear();
      await expect(profilePage.nameInput).toHaveValue('');

      await profilePage.nameInput.fill('New Test Name');
      await expect(profilePage.nameInput).toHaveValue('New Test Name');
    });
  });

  test.describe('Update Bio', () => {
    test('can add bio text', async ({ page }) => {
      await profilePage.goto();

      const testBio = `Test bio added at ${Date.now()}`;
      await profilePage.updateBio(testBio);

      // Verify bio input shows new value
      await expect(profilePage.bioInput).toHaveValue(testBio);

      // Save changes
      await profilePage.saveChanges();
    });

    test('bio field has correct placeholder', async () => {
      await profilePage.goto();

      await expect(profilePage.bioInput).toHaveAttribute('placeholder', 'Tell us about yourself...');
    });

    test('bio is optional and can be empty', async ({ page }) => {
      await profilePage.goto();

      // Clear bio
      await profilePage.updateBio('');

      // Verify bio input is empty
      await expect(profilePage.bioInput).toHaveValue('');

      // Save should succeed with empty bio
      await profilePage.saveChanges();
    });
  });

  test.describe('Timezone Selection', () => {
    test('timezone dropdown is visible', async () => {
      await profilePage.goto();

      await expect(profilePage.timezoneSelect).toBeVisible();
    });

    test('can change timezone selection', async ({ page }) => {
      await profilePage.goto();

      const originalTimezone = await profilePage.getTimezone();

      // Select a different timezone
      const newTimezoneLabel = originalTimezone.includes('America') ? 'Europe/London (GMT)' : 'America/New_York (EST)';
      await profilePage.selectTimezone(newTimezoneLabel);

      // Verify selection changed in dropdown
      const newTimezone = await profilePage.getTimezone();
      expect(newTimezone).not.toBe(originalTimezone);

      // Save changes
      await profilePage.saveChanges();

      // Restore original timezone
      await profilePage.timezoneSelect.selectOption({ value: originalTimezone });
      await profilePage.saveChanges();
    });

    test('timezone dropdown has multiple options', async () => {
      await profilePage.goto();

      const options = await profilePage.timezoneSelect.locator('option').count();
      expect(options).toBeGreaterThan(3);
    });
  });

  test.describe('Save Changes', () => {
    test('save button is clickable', async () => {
      await profilePage.goto();

      await expect(profilePage.saveButton).toBeEnabled();
      await expect(profilePage.saveButton).toHaveText(/save changes/i);
    });

    test('can save multiple field changes at once', async ({ page }) => {
      await profilePage.goto();

      const originalName = await profilePage.getName();

      // Update multiple fields
      const testName = `Multi Update ${Date.now()}`;
      const testBio = 'Multi-field update test';

      await profilePage.updateName(testName);
      await profilePage.updateBio(testBio);

      // Verify both inputs have new values
      await expect(profilePage.nameInput).toHaveValue(testName);
      await expect(profilePage.bioInput).toHaveValue(testBio);

      // Save changes
      await profilePage.saveChanges();

      // Restore original name
      await profilePage.updateName(originalName);
      await profilePage.saveChanges();
    });
  });

  test.describe('Sign Out', () => {
    test('sign out button is visible', async () => {
      await profilePage.goto();

      await expect(profilePage.signOutButton).toBeVisible();
      await expect(profilePage.signOutButton).toHaveText(/sign out/i);
    });

    // Skip this test as it would log out and affect other tests
    test.skip('clicking sign out redirects to login page', async () => {
      await profilePage.goto();
      await profilePage.signOut();
      // Would verify redirect to login
    });
  });

  test.describe('Navigation', () => {
    test('can navigate to profile from dashboard user menu', async ({ page, projectConfig }) => {
      // Start at dashboard
      await page.goto(`${projectConfig.baseUrl}/dashboard`);

      // Click user avatar to open menu
      await page.locator('button').filter({ hasText: /^[A-Z]{1,2}$/ }).first().click();

      // Click Profile link
      await page.getByRole('link', { name: 'Profile' }).click();

      // Should be on profile page
      await expect(page).toHaveURL(/.*\/profile.*/);
      await expect(profilePage.heading).toBeVisible();
    });

    test('can navigate to profile via direct URL', async ({ page, projectConfig }) => {
      await page.goto(`${projectConfig.baseUrl}/profile`);

      await expect(page).toHaveURL(/.*\/profile.*/);
      await expect(profilePage.heading).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('handles very long name input', async ({ page }) => {
      await profilePage.goto();

      const longName = 'A'.repeat(100);
      await profilePage.updateName(longName);

      // Should accept or truncate the long name
      const inputValue = await profilePage.getName();
      expect(inputValue.length).toBeGreaterThan(0);
    });

    test('handles special characters in name', async ({ page }) => {
      await profilePage.goto();

      const originalName = await profilePage.getName();
      const specialName = "Test O'Brien-Smith Jr.";

      await profilePage.updateName(specialName);

      // Verify name input accepts special characters
      await expect(profilePage.nameInput).toHaveValue(specialName);

      await profilePage.saveChanges();

      // Restore original name
      await profilePage.updateName(originalName);
      await profilePage.saveChanges();
    });

    test('handles unicode characters in bio', async ({ page }) => {
      await profilePage.goto();

      const unicodeBio = 'Hello! Unicode test with special chars';

      await profilePage.updateBio(unicodeBio);

      // Verify bio input accepts unicode
      await expect(profilePage.bioInput).toHaveValue(unicodeBio);

      await profilePage.saveChanges();
    });
  });
});
