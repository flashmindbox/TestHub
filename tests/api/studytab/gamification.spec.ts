import { test, expect } from '../../../src/fixtures';

test.describe('Gamification XP, Challenges & Leaderboard @studytab @api @gamification', () => {
  test.use({ storageState: '.auth/user.json' });

  const apiBase = (apiUrl: string) => `${apiUrl}/api/v1`;

  // ── XP endpoints ───────────────────────────────────────────────────────────

  test('GET /gamification/xp returns XP status', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/gamification/xp`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('xp');
    expect(body.data).toHaveProperty('level');
    expect(body.data).toHaveProperty('progress');
    expect(typeof body.data.xp).toBe('number');
    expect(typeof body.data.level).toBe('number');
    expect(typeof body.data.progress).toBe('number');
  });

  test('GET /gamification/xp/history returns array', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/gamification/xp/history`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    const history = Array.isArray(body.data) ? body.data : body.data?.history;
    expect(Array.isArray(history)).toBeTruthy();
  });

  // ── Leaderboard endpoints ──────────────────────────────────────────────────

  test('GET /gamification/leaderboard returns leaderboard entries', async ({ request, projectConfig }) => {
    const response = await request.get(`${apiBase(projectConfig.apiUrl)}/gamification/leaderboard`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    const entries = Array.isArray(body.data) ? body.data : body.data?.entries;
    expect(Array.isArray(entries)).toBeTruthy();
  });

  test('GET /gamification/leaderboard with period=daily works', async ({ request, projectConfig }) => {
    const response = await request.get(
      `${apiBase(projectConfig.apiUrl)}/gamification/leaderboard?period=daily`,
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  test('GET /gamification/leaderboard with period=monthly works', async ({ request, projectConfig }) => {
    const response = await request.get(
      `${apiBase(projectConfig.apiUrl)}/gamification/leaderboard?period=monthly`,
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  // ── Challenges endpoints ───────────────────────────────────────────────────

  test('GET /gamification/challenges/today returns 3 challenges', async ({ request, projectConfig }) => {
    const response = await request.get(
      `${apiBase(projectConfig.apiUrl)}/gamification/challenges/today`,
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');

    const challenges = Array.isArray(body.data) ? body.data : body.data?.challenges;
    expect(Array.isArray(challenges)).toBeTruthy();
    expect(challenges.length).toBe(3);

    // Verify difficulty distribution: 1 easy, 1 medium, 1 hard
    const difficulties = challenges.map((c: { difficulty: string }) => c.difficulty);
    expect(difficulties).toContain('easy');
    expect(difficulties).toContain('medium');
    expect(difficulties).toContain('hard');
  });

  test('GET /gamification/challenges/today each challenge has required fields', async ({ request, projectConfig }) => {
    const response = await request.get(
      `${apiBase(projectConfig.apiUrl)}/gamification/challenges/today`,
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const challenges = Array.isArray(body.data) ? body.data : body.data?.challenges;

    for (const challenge of challenges) {
      expect(challenge).toHaveProperty('title');
      expect(challenge).toHaveProperty('description');
      expect(challenge).toHaveProperty('xpReward');
      expect(challenge).toHaveProperty('difficulty');
      expect(typeof challenge.title).toBe('string');
      expect(typeof challenge.description).toBe('string');
      expect(typeof challenge.xpReward).toBe('number');
      expect(['easy', 'medium', 'hard']).toContain(challenge.difficulty);
    }
  });

  test('POST /gamification/challenges/:id/claim returns error for uncompleted challenge', async ({ request, projectConfig }) => {
    // First get today's challenges to find a valid challenge ID
    const challengesResponse = await request.get(
      `${apiBase(projectConfig.apiUrl)}/gamification/challenges/today`,
    );
    expect(challengesResponse.ok()).toBeTruthy();

    const challengesBody = await challengesResponse.json();
    const challenges = Array.isArray(challengesBody.data)
      ? challengesBody.data
      : challengesBody.data?.challenges;
    expect(challenges.length).toBeGreaterThan(0);

    const challengeId = challenges[0].id;

    // Try to claim an uncompleted challenge — should fail
    const claimResponse = await request.post(
      `${apiBase(projectConfig.apiUrl)}/gamification/challenges/${challengeId}/claim`,
    );

    expect(claimResponse.ok()).toBeFalsy();
    expect(claimResponse.status()).toBeGreaterThanOrEqual(400);
  });
});
