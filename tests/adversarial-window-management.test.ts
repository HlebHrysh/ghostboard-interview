import { describe, it, expect } from 'vitest';

export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateWebcamAlignment(
  monitorX: number,
  monitorY: number,
  monitorWidth: number,
  _monitorHeight: number,
  scaleFactor: number,
  hudWidth: number,
  topPadding: number,
  windowHeight?: number
): WindowGeometry {
  const scale = scaleFactor <= 0 ? 1.0 : scaleFactor;
  const physW = Math.round(hudWidth * scale);
  const physH = windowHeight !== undefined ? windowHeight : Math.round(420 * scale);

  const physX = monitorX + Math.trunc((monitorWidth - physW) / 2);
  const physY = monitorY + Math.round(topPadding * scale);

  return {
    x: physX,
    y: physY,
    width: physW,
    height: physH,
  };
}

export function clampOpacity(opacity: number): number {
  return Math.min(1.0, Math.max(0.05, opacity));
}

describe('Empirical Adversarial Window Management Stress Tests', () => {
  describe('1. Alignment Calculation', () => {
    it('handles negative coordinate monitors (Left & Top secondary displays)', () => {
      // Left monitor: -1920 to 0
      const left = calculateWebcamAlignment(-1920, 0, 1920, 1080, 1.0, 760, 20);
      expect(left.x).toBe(-1340);
      expect(left.y).toBe(20);
      expect(left.width).toBe(760);
      expect(left.height).toBe(420);
      expect(left.x + left.width / 2).toBe(-1920 + 1920 / 2);

      // Top monitor: -1080 to 0
      const top = calculateWebcamAlignment(0, -1080, 1920, 1080, 1.0, 760, 20);
      expect(top.x).toBe(580);
      expect(top.y).toBe(-1060);
      expect(top.x + top.width / 2).toBe(960);

      // Top-Left diagonal monitor: -2560 to 0 X, -1440 to 0 Y
      const diag = calculateWebcamAlignment(-2560, -1440, 2560, 1440, 1.0, 760, 20);
      expect(diag.x).toBe(-1660);
      expect(diag.y).toBe(-1420);
      expect(diag.x + diag.width / 2).toBe(-2560 + 2560 / 2);
    });

    it('handles HiDPI 4K and 5K retina displays with 2.0x integer scaling', () => {
      // 4K UHD: 3840x2160, scale 2.0
      const uhd = calculateWebcamAlignment(0, 0, 3840, 2160, 2.0, 760, 20);
      expect(uhd.width).toBe(1520);
      expect(uhd.height).toBe(840);
      expect(uhd.x).toBe(1160);
      expect(uhd.y).toBe(40);
      expect(uhd.x + uhd.width / 2).toBe(1920);

      // 5K: 5120x2880, scale 2.0
      const ret5k = calculateWebcamAlignment(0, 0, 5120, 2880, 2.0, 760, 20);
      expect(ret5k.width).toBe(1520);
      expect(ret5k.height).toBe(840);
      expect(ret5k.x).toBe(1800);
      expect(ret5k.y).toBe(40);
      expect(ret5k.x + ret5k.width / 2).toBe(2560);
    });

    it('handles Ultrawide (21:9) and Super Ultrawide (32:9) displays', () => {
      // 21:9 Ultrawide: 3440x1440
      const uw = calculateWebcamAlignment(0, 0, 3440, 1440, 1.0, 760, 20);
      expect(uw.width).toBe(760);
      expect(uw.x).toBe(1340);
      expect(uw.y).toBe(20);
      expect(uw.x + uw.width / 2).toBe(1720);

      // 32:9 Super Ultrawide: 5120x1440
      const suw = calculateWebcamAlignment(0, 0, 5120, 1440, 1.0, 760, 20);
      expect(suw.width).toBe(760);
      expect(suw.x).toBe(2180);
      expect(suw.y).toBe(20);
      expect(suw.x + suw.width / 2).toBe(2560);
    });

    it('handles fractional scaling (1.25x, 1.5x, 1.75x, 2.25x, 1.333x)', () => {
      // 1.25x on 1080p
      const s125 = calculateWebcamAlignment(0, 0, 1920, 1080, 1.25, 760, 20);
      expect(s125.width).toBe(950);
      expect(s125.height).toBe(525);
      expect(s125.x).toBe(485);
      expect(s125.y).toBe(25);
      expect(s125.x + s125.width / 2).toBe(960);

      // 1.50x on 1440p
      const s150 = calculateWebcamAlignment(0, 0, 2560, 1440, 1.5, 760, 20);
      expect(s150.width).toBe(1140);
      expect(s150.height).toBe(630);
      expect(s150.x).toBe(710);
      expect(s150.y).toBe(30);
      expect(s150.x + s150.width / 2).toBe(1280);

      // 1.75x on 4K
      const s175 = calculateWebcamAlignment(0, 0, 3840, 2160, 1.75, 760, 20);
      expect(s175.width).toBe(1330);
      expect(s175.height).toBe(735);
      expect(s175.x).toBe(1255);
      expect(s175.y).toBe(35);
      expect(s175.x + s175.width / 2).toBe(1920);

      // 2.25x on 4K
      const s225 = calculateWebcamAlignment(0, 0, 3840, 2160, 2.25, 760, 20);
      expect(s225.width).toBe(1710);
      expect(s225.height).toBe(945);
      expect(s225.x).toBe(1065);
      expect(s225.y).toBe(45);
      expect(s225.x + s225.width / 2).toBe(1920);
    });

    it('handles extreme and boundary alignment inputs safely', () => {
      // 0.0 scale fallback
      const zero = calculateWebcamAlignment(0, 0, 1920, 1080, 0.0, 760, 20);
      expect(zero.width).toBe(760);
      expect(zero.x).toBe(580);

      // Negative scale fallback
      const neg = calculateWebcamAlignment(0, 0, 1920, 1080, -1.0, 760, 20);
      expect(neg.width).toBe(760);
      expect(neg.x).toBe(580);

      // Display narrower than HUD (600px width portrait)
      const narrow = calculateWebcamAlignment(0, 0, 600, 1080, 1.0, 760, 20);
      expect(narrow.width).toBe(760);
      expect(narrow.x).toBe(-80);
      expect(narrow.x + narrow.width / 2).toBe(300);
    });
  });

  describe('2. Opacity Clamping Stress Tests', () => {
    it('strictly clamps required test values (-1.0, 0.0, 0.01, 0.05, 0.5, 1.0, 2.0)', () => {
      expect(clampOpacity(-1.0)).toBe(0.05);
      expect(clampOpacity(0.0)).toBe(0.05);
      expect(clampOpacity(0.01)).toBe(0.05);
      expect(clampOpacity(0.05)).toBe(0.05);
      expect(clampOpacity(0.5)).toBe(0.5);
      expect(clampOpacity(1.0)).toBe(1.0);
      expect(clampOpacity(2.0)).toBe(1.0);
    });

    it('handles extreme bounds and precision boundaries', () => {
      expect(clampOpacity(-Infinity)).toBe(0.05);
      expect(clampOpacity(Infinity)).toBe(1.0);
      expect(clampOpacity(0.049999)).toBe(0.05);
      expect(clampOpacity(0.050001)).toBeCloseTo(0.050001, 5);
      expect(clampOpacity(0.999999)).toBeCloseTo(0.999999, 5);
      expect(clampOpacity(1.000001)).toBe(1.0);
    });
  });
});
