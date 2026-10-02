import { describe, it, expect } from 'vitest';
import { ROLE_PRESETS } from '../src/components/CandidateProfileModal';
import { normalizeTechnicalSpeech, hasTechnicalKeyword } from '../src/lib/techSpeechNormalizer';

describe('Role Presets & Cross-Stack Coverage', () => {
  it('contains at least 18 IT role presets covering major development stacks', () => {
    const keys = Object.keys(ROLE_PRESETS);
    expect(keys.length).toBeGreaterThanOrEqual(18);
  });

  it('validates required fields for each preset', () => {
    for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
      expect(preset.label, `Preset ${key} must have label`).toBeTruthy();
      expect(preset.role, `Preset ${key} must have role`).toBeTruthy();
      expect(preset.category, `Preset ${key} must have category`).toBeTruthy();
      expect(Array.isArray(preset.techStack), `Preset ${key} techStack must be array`).toBe(true);
      expect(preset.techStack?.length, `Preset ${key} techStack must not be empty`).toBeGreaterThan(0);
      expect(preset.customContext, `Preset ${key} customContext must not be empty`).toBeTruthy();
      if (preset.petProjects) {
        expect(Array.isArray(preset.petProjects)).toBe(true);
        expect(preset.petProjects.length).toBeGreaterThan(0);
      }
    }
  });

  it('includes key stacks: frontend, node, java, go, .net, mobile, devops, qa, data science', () => {
    const keys = Object.keys(ROLE_PRESETS);
    expect(keys).toContain('frontend');
    expect(keys).toContain('python_backend');
    expect(keys).toContain('nodejs_backend');
    expect(keys).toContain('java_backend');
    expect(keys).toContain('golang_backend');
    expect(keys).toContain('dotnet_backend');
    expect(keys).toContain('fullstack');
    expect(keys).toContain('ios_mobile');
    expect(keys).toContain('android_mobile');
    expect(keys).toContain('flutter_mobile');
    expect(keys).toContain('devops');
    expect(keys).toContain('qa_automation');
    expect(keys).toContain('data_engineer');
    expect(keys).toContain('data_science');
    expect(keys).toContain('system_architect');
    expect(keys).toContain('product_manager');
    expect(keys).toContain('uiux_designer');
    expect(keys).toContain('cybersecurity');
  });

  it('normalizes cross-stack spoken technical terms', () => {
    // Frontend
    expect(normalizeTechnicalSpeech('реакт хуки та юзефект')).toContain('React');
    expect(normalizeTechnicalSpeech('реакт хуки та юзефект')).toContain('useEffect');
    // Java & Go
    expect(normalizeTechnicalSpeech('спрінг бут та джівіем')).toContain('Spring Boot');
    expect(normalizeTechnicalSpeech('горутини в го')).toContain('Goroutines');
    // .NET & C#
    expect(normalizeTechnicalSpeech('дотнет та сі-шарп лінк')).toContain('.NET');
    expect(normalizeTechnicalSpeech('дотнет та сі-шарп лінк')).toContain('LINQ');
    // Mobile
    expect(normalizeTechnicalSpeech('свіфтюай')).toContain('SwiftUI');
    expect(normalizeTechnicalSpeech('джетпак компоуз')).toContain('Jetpack Compose');
    // QA & Cloud
    expect(normalizeTechnicalSpeech('плейрайт')).toContain('Playwright');
    expect(normalizeTechnicalSpeech('терраформ')).toContain('Terraform');
  });

  it('detects technical keywords across different professions', () => {
    expect(hasTechnicalKeyword('розкажи про useeffect та virtual dom')).toBe(true);
    expect(hasTechnicalKeyword('як налаштувати spring boot')).toBe(true);
    expect(hasTechnicalKeyword('що таке goroutine у go')).toBe(true);
    expect(hasTechnicalKeyword('як оптимізувати linq запити')).toBe(true);
    expect(hasTechnicalKeyword('як протестувати через playwright')).toBe(true);
    expect(hasTechnicalKeyword('що таке rag та векторні бази')).toBe(true);
  });
});
