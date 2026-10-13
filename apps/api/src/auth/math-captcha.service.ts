import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface MathChallenge {
  question: string;
  answer: number;
  expiresAt: number;
}

@Injectable()
export class MathCaptchaService {
  private readonly challenges = new Map<string, MathChallenge>();
  private readonly enabled: boolean;
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly config: ConfigService) {
    this.enabled = config.get<boolean>('MATH_CAPTCHA_ENABLED', true);
    // Cleanup expired challenges every minute
    setInterval(() => this.cleanup(), 60_000).unref();
  }

  generateChallenge(): { challengeId: string; question: string } {
    const a = Math.floor(Math.random() * 10) + 1; // 1-10
    const b = Math.floor(Math.random() * 10) + 1; // 1-10
    const operator = Math.random() > 0.5 ? '+' : '-';
    
    let answer: number;
    let question: string;
    
    if (operator === '+') {
      answer = a + b;
      question = `${a} + ${b} = ?`;
    } else {
      // Ensure positive result for subtraction
      const max = Math.max(a, b);
      const min = Math.min(a, b);
      answer = max - min;
      question = `${max} - ${min} = ?`;
    }

    const challengeId = crypto.randomBytes(16).toString('hex');
    this.challenges.set(challengeId, {
      question,
      answer,
      expiresAt: Date.now() + this.ttlMs,
    });

    return { challengeId, question };
  }

  verify(challengeId: string, userAnswer: number): boolean {
    if (!this.enabled) {
      return true;
    }

    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return false;
    }

    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return false;
    }

    const valid = challenge.answer === userAnswer;
    if (valid) {
      this.challenges.delete(challengeId); // Single use
    }
    return valid;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(id);
      }
    }
  }
}