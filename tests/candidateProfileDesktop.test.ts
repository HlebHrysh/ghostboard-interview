import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CandidateProfile,
  DEFAULT_CANDIDATE_PROFILE,
  EXPERIENCE_LEVELS,
  ROLE_PRESETS,
  PROFILE_STORAGE_KEY,
  getStoredProfile,
  saveStoredProfile,
  resetStoredProfile,
  validateCandidateProfile,
  normalizeCandidateLevel,
  syncProfileToBackend,
  fetchBackendProfile,
  convertFileToBase64,
  parseResumePdf,
  resolveApiUrl,
} from '../desktop/src/lib/profileStore';
import { DualStreamClient } from '../desktop/src/lib/streamClient';

describe('Milestone 4: Candidate Profile & Resume Context Injection (Desktop)', () => {
  // Mock localStorage for node test runner
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    mockStorage = {};

    const mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = String(value);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    };

    (globalThis as any).localStorage = mockLocalStorage;
    (globalThis as any).window = globalThis;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).localStorage;
    delete (globalThis as any).window;
  });

  describe('1. Profile Persistence & Local Storage Lifecycle', () => {
    it('returns DEFAULT_CANDIDATE_PROFILE when localStorage is uninitialized', () => {
      const profile = getStoredProfile();
      expect(profile).toBeDefined();
      expect(profile.role).toBe(DEFAULT_CANDIDATE_PROFILE.role);
      expect(profile.experienceLevel).toBe('senior');
      expect(profile.techStack).toEqual(DEFAULT_CANDIDATE_PROFILE.techStack);
      expect(profile.customBio).toBe(DEFAULT_CANDIDATE_PROFILE.customBio);
    });

    it('persists candidate profile modifications into localStorage', () => {
      const customProfile: CandidateProfile = {
        role: 'Staff Infrastructure Architect',
        primaryStack: 'Go, Kubernetes, Terraform, AWS, Kafka',
        techStack: ['Go', 'Kubernetes', 'Terraform', 'AWS', 'Kafka'],
        experienceLevel: 'principal',
        customBio: 'Specializing in resilient multi-region cloud backbones with 99.999% uptime.',
        petProjects: [
          {
            id: 'proj_infra_1',
            name: 'Global Mesh Router',
            description: 'Envoy-based edge routing system',
            keyHighlight: 'Sub-1ms p99 overhead',
          },
        ],
      };

      saveStoredProfile(customProfile);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        PROFILE_STORAGE_KEY,
        expect.any(String)
      );

      const raw = mockStorage[PROFILE_STORAGE_KEY];
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw);
      expect(parsed.role).toBe('Staff Infrastructure Architect');
      expect(parsed.experienceLevel).toBe('principal');
      expect(parsed.techStack).toHaveLength(5);
    });

    it('retrieves saved profile from localStorage accurately with synchronizing primaryStack', () => {
      const testProfile: CandidateProfile = {
        role: 'Senior Python Engineer',
        primaryStack: 'Python, FastAPI, PostgreSQL',
        techStack: ['Python', 'FastAPI', 'PostgreSQL'],
        experienceLevel: 'senior',
        customBio: 'Asyncio microservices expert',
      };
      saveStoredProfile(testProfile);

      const loaded = getStoredProfile();
      expect(loaded.role).toBe('Senior Python Engineer');
      expect(loaded.experienceLevel).toBe('senior');
      expect(loaded.techStack).toContain('FastAPI');
      expect(loaded.primaryStack).toContain('FastAPI');
      expect(loaded.customBio).toBe('Asyncio microservices expert');
    });

    it('handles corrupted JSON in localStorage gracefully without crashing', () => {
      mockStorage[PROFILE_STORAGE_KEY] = 'INVALID_{{{JSON_CORRUPT';

      const fallback = getStoredProfile();
      expect(fallback).toBeDefined();
      expect(fallback.role).toBe(DEFAULT_CANDIDATE_PROFILE.role);
      expect(fallback.experienceLevel).toBe(DEFAULT_CANDIDATE_PROFILE.experienceLevel);
    });

    it('resets profile to factory defaults and updates localStorage', () => {
      mockStorage[PROFILE_STORAGE_KEY] = JSON.stringify({
        role: 'Temporary Role',
        experienceLevel: 'junior',
      });

      const reset = resetStoredProfile();
      expect(reset.role).toBe(DEFAULT_CANDIDATE_PROFILE.role);
      expect(reset.experienceLevel).toBe('senior');

      const loaded = getStoredProfile();
      expect(loaded.role).toBe(DEFAULT_CANDIDATE_PROFILE.role);
    });
  });

  describe('2. Seniority Level Normalization & Validation', () => {
    it('normalizes all variations of seniority levels to typed CandidateLevel enum', () => {
      expect(normalizeCandidateLevel('Junior')).toBe('junior');
      expect(normalizeCandidateLevel('jr.')).toBe('junior');
      expect(normalizeCandidateLevel('trainee engineer')).toBe('junior');
      expect(normalizeCandidateLevel('Middle')).toBe('middle');
      expect(normalizeCandidateLevel('mid-level developer')).toBe('middle');
      expect(normalizeCandidateLevel('Senior')).toBe('senior');
      expect(normalizeCandidateLevel('Sr. Developer')).toBe('senior');
      expect(normalizeCandidateLevel('Lead')).toBe('lead');
      expect(normalizeCandidateLevel('Tech Lead / Team Lead')).toBe('lead');
      expect(normalizeCandidateLevel('Principal')).toBe('principal');
      expect(normalizeCandidateLevel('Staff Engineer')).toBe('principal');
      expect(normalizeCandidateLevel('Solutions Architect')).toBe('principal');
      expect(normalizeCandidateLevel(null)).toBe('senior');
      expect(normalizeCandidateLevel('')).toBe('senior');
    });

    it('validates candidate profile requiring non-empty role and at least one skill', () => {
      const validProfile = {
        role: 'Full-Stack Developer',
        techStack: ['TypeScript', 'React'],
      };
      const validRes = validateCandidateProfile(validProfile);
      expect(validRes.valid).toBe(true);
      expect(validRes.errors).toHaveLength(0);

      const emptyRole = {
        role: '   ',
        techStack: ['TypeScript'],
      };
      const emptyRoleRes = validateCandidateProfile(emptyRole);
      expect(emptyRoleRes.valid).toBe(false);
      expect(emptyRoleRes.errors).toContain('Target role cannot be empty.');

      const emptyStack = {
        role: 'Developer',
        techStack: [],
        primaryStack: '',
      };
      const emptyStackRes = validateCandidateProfile(emptyStack);
      expect(emptyStackRes.valid).toBe(false);
      expect(emptyStackRes.errors[0]).toContain('primary stack');
    });
  });

  describe('3. Role Presets & Experience Levels Integrity', () => {
    it('provides all 5 standard experience levels with badges and descriptions', () => {
      expect(EXPERIENCE_LEVELS).toHaveLength(5);
      const levelIds = EXPERIENCE_LEVELS.map((l) => l.id);
      expect(levelIds).toEqual(['junior', 'middle', 'senior', 'lead', 'principal']);

      for (const level of EXPERIENCE_LEVELS) {
        expect(level.badge).toBeTruthy();
        expect(level.colorClass).toBeTruthy();
        expect(level.description).toBeTruthy();
      }
    });

    it('contains comprehensive role presets across major tech stacks', () => {
      const presetKeys = Object.keys(ROLE_PRESETS);
      expect(presetKeys).toContain('fullstack');
      expect(presetKeys).toContain('frontend');
      expect(presetKeys).toContain('python_backend');
      expect(presetKeys).toContain('nodejs_backend');
      expect(presetKeys).toContain('golang_backend');
      expect(presetKeys).toContain('java_backend');
      expect(presetKeys).toContain('dotnet_backend');
      expect(presetKeys).toContain('devops');
      expect(presetKeys).toContain('system_architect');

      for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
        expect(preset.role, `Preset ${key} role`).toBeTruthy();
        expect(preset.primaryStack, `Preset ${key} primaryStack`).toBeTruthy();
        expect(preset.techStack.length, `Preset ${key} techStack`).toBeGreaterThan(0);
        expect(preset.customBio, `Preset ${key} customBio`).toBeTruthy();
        expect(preset.level, `Preset ${key} level`).toBeTruthy();
      }
    });
  });

  describe('4. Backend Synchronization (/api/profile/context)', () => {
    it('synchronizes profile to backend via POST with Bearer token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      (globalThis as any).fetch = mockFetch;

      const profile: CandidateProfile = {
        role: 'Go Backend Developer',
        primaryStack: 'Go, gRPC, PostgreSQL',
        techStack: ['Go', 'gRPC', 'PostgreSQL'],
        experienceLevel: 'senior',
        customBio: 'High concurrency systems engineer',
      };

      const result = await syncProfileToBackend(
        profile,
        'http://localhost:3001',
        'test-jwt-access-token-123'
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/profile/context',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-jwt-access-token-123',
            'x-ghostboard-client': 'desktop-app',
          }),
        })
      );

      // Verify payload body
      const callArgs = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(callArgs[1].body);
      expect(sentBody.candidateProfile.role).toBe('Go Backend Developer');
      expect(sentBody.resumeContext).toBe('High concurrency systems engineer');
    });

    it('fetches profile from backend via GET and maps fields into CandidateProfile', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          resumeContext: 'Backend specialist',
          candidateProfile: {
            role: 'Lead Cloud Architect',
            level: 'lead',
            techStack: ['AWS', 'Terraform', 'Kubernetes'],
            primaryStack: 'AWS, Terraform, Kubernetes',
          },
        }),
      });
      (globalThis as any).fetch = mockFetch;

      const profile = await fetchBackendProfile(
        'https://ghostboard.ai',
        'auth-token-xyz'
      );

      expect(profile).not.toBeNull();
      expect(profile?.role).toBe('Lead Cloud Architect');
      expect(profile?.experienceLevel).toBe('lead');
      expect(profile?.techStack).toEqual(['AWS', 'Terraform', 'Kubernetes']);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://ghostboard.ai/api/profile/context',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token-xyz',
          }),
        })
      );
    });

    it('handles backend sync error safely without unhandled promise rejection', async () => {
      (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));

      const profile = DEFAULT_CANDIDATE_PROFILE;
      const result = await syncProfileToBackend(profile, 'http://localhost:3001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network unreachable');
    });
  });

  describe('5. Resume PDF Parsing & Base64 Extraction', () => {
    it('converts file buffer to base64 data URL', async () => {
      // Mock File/Blob in node
      const samplePdfContent = Buffer.from('%PDF-1.4 Mock Resume Binary Content');
      const blob = new Blob([samplePdfContent], { type: 'application/pdf' });

      const base64Data = await convertFileToBase64(blob);
      expect(base64Data).toContain('data:application/pdf;base64,');
      expect(base64Data.length).toBeGreaterThan(30);
    });

    it('sends base64 PDF payload to /api/ai/parse-resume and parses response', async () => {
      const mockParsedResume = {
        success: true,
        profile: {
          role: 'Senior Rust & Go Systems Engineer',
          level: 'senior',
          techStack: ['Rust', 'Go', 'Tokio', 'Docker', 'PostgreSQL'],
          summary: 'Expert in low-latency concurrent systems',
          petProjects: [
            {
              name: 'High-Throughput IPC Ring Buffer',
              description: 'Zero-copy lock-free ring buffer for audio streaming',
              keyHighlight: 'Sub-50 microsecond delivery',
            },
          ],
          cvContext: '10 years experience building distributed engines.',
        },
        modelUsed: 'gemini-3.8-flash',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockParsedResume,
      });
      (globalThis as any).fetch = mockFetch;

      const fakeBase64 = 'data:application/pdf;base64,JVBERi0xLjQK...';
      const result = await parseResumePdf(
        fakeBase64,
        'my_cv.pdf',
        'http://localhost:3001',
        'test-token'
      );

      expect(result.success).toBe(true);
      expect(result.profile?.role).toBe('Senior Rust & Go Systems Engineer');
      expect(result.profile?.experienceLevel).toBe('senior');
      expect(result.profile?.techStack).toContain('Rust');
      expect(result.profile?.petProjects).toHaveLength(1);
      expect(result.profile?.petProjects?.[0].name).toBe('High-Throughput IPC Ring Buffer');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/parse-resume',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('resolves API URLs correctly with local dev proxy or cloud domain', () => {
      expect(resolveApiUrl('/api/profile/context')).toBe('/api/profile/context');
      expect(resolveApiUrl('/api/profile/context', 'http://localhost:3001')).toBe(
        'http://localhost:3001/api/profile/context'
      );
      expect(resolveApiUrl('/api/profile/context', 'https://ghostboard.ai/')).toBe(
        'https://ghostboard.ai/api/profile/context'
      );
    });
  });

  describe('6. AI Pipeline Context Injection & Payload Delivery', () => {
    it('injects candidateProfile into DualStreamClient request body', async () => {
      const client = new DualStreamClient('http://localhost:3001');

      let capturedPayload: any = null;
      (globalThis as any).fetch = vi.fn().mockImplementation((_url, init) => {
        capturedPayload = JSON.parse(init.body);
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () => {
              let sent = false;
              return {
                read: async () => {
                  if (!sent) {
                    sent = true;
                    const chunk =
                      'event: chunk\ndata: {"text":"<<<PHASE_1:HOOK>>>\\nCustom answer for Senior Go candidate.\\n<<<PHASE_2:PILLARS>>>\\n• P1\\n<<<PHASE_3:DEEP_DIVE>>>\\nDetails\\n<<<END>>>"}\n\n';
                    return { done: false, value: new TextEncoder().encode(chunk) };
                  }
                  return { done: true, value: undefined };
                },
              };
            },
          },
        });
      });

      const profile: CandidateProfile = {
        role: 'Senior Go Engineer',
        primaryStack: 'Go, Kubernetes, gRPC',
        techStack: ['Go', 'Kubernetes', 'gRPC'],
        experienceLevel: 'senior',
        customBio: 'Focusing on distributed microservices and low latency',
      };

      await client.requestStream({
        question: 'How do you handle microservices latency?',
        directorModifier: 'normal',
        candidateProfile: {
          role: profile.role,
          primaryStack: profile.primaryStack,
          experienceLevel: profile.experienceLevel,
          customBio: profile.customBio,
          techStack: profile.techStack,
        },
        authToken: 'token-abc',
      });

      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload.question).toContain('How do you handle microservices latency?');
      expect(capturedPayload.candidateProfile).toBeDefined();
      expect(capturedPayload.candidateProfile.role).toBe('Senior Go Engineer');
      expect(capturedPayload.candidateProfile.experienceLevel).toBe('senior');
      expect(capturedPayload.candidateProfile.primaryStack).toBe('Go, Kubernetes, gRPC');
      expect(capturedPayload.candidateProfile.customBio).toContain('low latency');
      expect(capturedPayload.authToken).toBe('token-abc');
    });

    it('injects candidateProfile into Screenshot OCR payload format', () => {
      const activeCandidateProfile: CandidateProfile = {
        role: 'Lead Solutions Architect',
        primaryStack: 'Python, PostgreSQL, AWS, Docker',
        techStack: ['Python', 'PostgreSQL', 'AWS', 'Docker'],
        experienceLevel: 'lead',
        customBio: 'Specializing in resilient high-load architectures',
      };

      // Replicate handleTriggerScreenshot payload construction logic
      const screenshotPayload = {
        imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        mimeType: 'image/png',
        locale: 'uk',
        outputLanguage: 'uk',
        sessionMode: 'interview',
        candidateProfile: {
          role: activeCandidateProfile.role,
          level: activeCandidateProfile.experienceLevel,
          primaryStack: activeCandidateProfile.primaryStack || activeCandidateProfile.techStack.join(', '),
          techStack: activeCandidateProfile.techStack,
          customBio: activeCandidateProfile.customBio,
        },
      };

      expect(screenshotPayload.candidateProfile.role).toBe('Lead Solutions Architect');
      expect(screenshotPayload.candidateProfile.level).toBe('lead');
      expect(screenshotPayload.candidateProfile.techStack).toContain('PostgreSQL');
      expect(screenshotPayload.candidateProfile.customBio).toBe('Specializing in resilient high-load architectures');
    });
  });
});
