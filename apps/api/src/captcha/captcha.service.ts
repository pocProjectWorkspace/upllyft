// apps/api/src/captcha/captcha.service.ts

import { Injectable } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';

@Injectable()
export class CaptchaService {
  // ✅ Generate complex alphanumeric captcha
  generateCaptcha() {
    const captcha = svgCaptcha.create({
      size: 6,              // 6 characters for complexity
      noise: 3,             // Add noise lines
      color: true,          // Use colored characters
      background: '#f0f0f0', // Light background
      fontSize: 50,         // Readable size
      width: 200,           // Wider canvas
      height: 80,           // Taller canvas
      charPreset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // No confusing chars
      ignoreChars: '0o1ilI', // Explicitly ignore confusing characters
    });

    return {
      text: captcha.text,
      image: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`,
    };
  }

  // ✅ Generate math captcha (alternative option)
  generateMathCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer: number;
    let question: string;
    
    if (operator === '+') {
      answer = num1 + num2;
      question = `${num1} + ${num2}`;
    } else if (operator === '-') {
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      answer = larger - smaller;
      question = `${larger} - ${smaller}`;
    } else {
      // Multiplication
      const smallNum1 = Math.floor(Math.random() * 5) + 1;
      const smallNum2 = Math.floor(Math.random() * 5) + 1;
      answer = smallNum1 * smallNum2;
      question = `${smallNum1} × ${smallNum2}`;
    }

    const captcha = (svgCaptcha as any).create(question, {
      fontSize: 45,
      width: 200,
      height: 80,
      background: '#f0f0f0',
    });

    return {
      text: answer.toString(),
      image: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`,
    };
  }
}