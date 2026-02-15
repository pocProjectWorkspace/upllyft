import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException, Logger
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateAuthProfileDto } from './dto/update-profile.dto';
import { User, Role, VerificationStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { CaptchaService } from '../captcha/captcha.service';
import * as crypto from 'crypto';
import * as svgCaptcha from 'svg-captcha';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes as rb } from 'crypto';
import { promisify } from 'util';
import { AppLoggerService } from '../common/logging';
import { FcmTokenService } from '../fcm-token/fcm-token.service';

@Injectable()
export class AuthService {

  private readonly logger = new Logger(AuthService.name);

  revokeRefreshToken(id: any, refreshToken: string) {
    throw new Error('Method not implemented.');
  }
  revokeAllRefreshTokens(id: any) {
    throw new Error('Method not implemented.');
  }

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private captchaService: CaptchaService,
    private eventEmitter: EventEmitter2,
    private appLogger: AppLoggerService,
    private fcmTokenService: FcmTokenService,
  ) {
    this.appLogger.setContext('AuthService');
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      // Log failed login attempt (no userId since user not found)
      this.appLogger.logAuth('LOGIN_FAILED', undefined, {
        reason: 'Invalid credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch full user profile with organizationMemberships
    const fullProfile = await this.getProfile(user.id);

    // Check for suspended or deactivated memberships
    const memberships = fullProfile.organizationMemberships || [];

    // Debug logging
    this.logger.log(`🔐 Login attempt for user: ${loginDto.email}`);
    this.logger.log(`📋 Total memberships: ${memberships.length}`);
    memberships.forEach((m: any, i: number) => {
      this.logger.log(`   [${i}] Org: ${m.organization?.name}, Status: ${m.status}`);
    });

    const suspendedMemberships = memberships.filter(
      (m: any) => m.status === 'SUSPENDED'
    );
    const deactivatedMemberships = memberships.filter(
      (m: any) => m.status === 'DEACTIVATED'
    );

    // If ALL memberships are deactivated, deny login
    if (memberships.length > 0 && deactivatedMemberships.length === memberships.length) {
      throw new UnauthorizedException({
        message: 'Your account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED',
        organizations: deactivatedMemberships.map((m: any) => m.organization?.name).filter(Boolean)
      });
    }

    // If ALL non-deactivated memberships are suspended, deny login but with different message
    const activeMemberships = memberships.filter(
      (m: any) => m.status !== 'DEACTIVATED'
    );
    if (activeMemberships.length > 0 && activeMemberships.every((m: any) => m.status === 'SUSPENDED')) {
      throw new UnauthorizedException({
        message: 'Your account has been suspended',
        code: 'ACCOUNT_SUSPENDED',
        organizations: suspendedMemberships.map((m: any) => m.organization?.name).filter(Boolean)
      });
    }

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      verificationStatus: user.verificationStatus,
      name: user.name ?? undefined,
      avatar: user.image ?? undefined,
      bio: user.bio ?? undefined,
    });

    // Log successful login
    this.appLogger.logAuth('LOGIN_SUCCESS', user.id, {
      role: user.role,
    });

    // Register FCM token if provided (async, don't block login response)
    if (loginDto.fcmToken && loginDto.device) {
      this.fcmTokenService.registerToken(user.id, user.email, {
        fcmToken: loginDto.fcmToken,
        device: loginDto.device as any,
      }).then(() => {
        this.logger.log(`✅ FCM token registered for user ${user.id} on device ${loginDto.device}`);
      }).catch((error) => {
        this.logger.error(`❌ Failed to register FCM token: ${error.message}`);
      });
    }

    // Include membership status info in response
    return {
      ...tokens,
      user: fullProfile,
      membershipStatus: {
        hasActiveMemberships: memberships.some((m: any) => m.status === 'ACTIVE'),
        hasSuspendedMemberships: suspendedMemberships.length > 0,
        hasDeactivatedMemberships: deactivatedMemberships.length > 0,
        suspendedOrganizations: suspendedMemberships.map((m: any) => ({
          name: m.organization?.name,
          slug: m.organization?.slug
        })),
        deactivatedOrganizations: deactivatedMemberships.map((m: any) => ({
          name: m.organization?.name,
          slug: m.organization?.slug
        }))
      }
    };
  }

  // Google OAuth Login/Register
  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    image?: string;
  }) {
    // Check if user exists with this email
    let user = await this.usersService.findByEmail(googleUser.email);

    if (user) {
      // User exists - update Google ID if not set
      if (!(user as any).googleId) {
        user = await this.usersService.update(user.id, {
          googleId: googleUser.googleId,
          image: googleUser.image || user.image,
        });
      }
    } else {
      // Create new user with Google account
      user = await this.usersService.create({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        image: googleUser.image,
        role: Role.USER,
        verificationStatus: VerificationStatus.PENDING,
        // No password needed for OAuth users
        password: null,
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    return this.generateTokens({
      id: userWithoutPassword.id,
      email: userWithoutPassword.email,
      role: userWithoutPassword.role,
      verificationStatus: userWithoutPassword.verificationStatus,
      name: userWithoutPassword.name ?? undefined,
      avatar: userWithoutPassword.image ?? undefined,
      bio: userWithoutPassword.bio ?? undefined,
    });
  }

  // In auth.service.ts, add this method:

  async validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    name: string;
    image?: string;
  }) {
    // Check if user exists with this email
    let user = await this.usersService.findByEmail(googleUser.email);

    if (user) {
      // User exists - update Google ID if not set
      if (!(user as any).googleId) {
        user = await this.usersService.update(user.id, {
          googleId: googleUser.googleId,
          image: googleUser.image || user.image,
        });
      }
    } else {
      // Create new user with Google account
      user = await this.usersService.create({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        image: googleUser.image,
        role: Role.USER,
        verificationStatus: VerificationStatus.PENDING,
        password: null,
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async googleLoginWithIdToken(idToken: string) {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));

    const ticket = await client.verifyIdToken({
      idToken,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    return this.googleLogin({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      image: payload.picture,
    });
  }

  async refreshToken(refreshTokenDto: { refreshToken: string }) {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub || payload.id },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token (must include role + verificationStatus to match login tokens)
      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '15m',
        },
      );

      return {
        accessToken,
        refreshToken: refreshTokenDto.refreshToken, // Return same refresh token
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Register a new user and auto-login (return tokens)
   */
  async register(registerDto: any, sessionCaptcha?: string): Promise<any> {
    try {
      const { email, password, name, captcha, role, licenseNumber, specialization, yearsOfExperience, organization, bio, fcmToken, device } = registerDto;

      console.log('🔵 Registration attempt:', { email, name, role });

      // Validate captcha
      if (sessionCaptcha && captcha) {
        const isValidCaptcha =
          sessionCaptcha.toLowerCase() === captcha.toLowerCase().trim();

        if (!isValidCaptcha) {
          throw new BadRequestException('Invalid captcha');
        }
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (!this.prisma) {
        throw new Error('PrismaService not injected!');
      }

      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ Determine role and verification status
      let userRole = 'USER';
      let verificationStatus = 'VERIFIED'; // Default for regular users

      if (role) {
        const professionalRoles = ['THERAPIST', 'EDUCATOR', 'ORGANIZATION'];
        if (professionalRoles.includes(role)) {
          userRole = role;
          verificationStatus = 'PENDING'; // ✅ Professionals need verification
        }
      }

      // ✅ Create user with ALL fields
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: name || '',
          role: userRole,  // ✅ Set the role!
          verificationStatus: verificationStatus,  // ✅ Set verification status!
          // ✅ Add professional fields if they exist
          ...(licenseNumber && { licenseNumber }),
          ...(specialization && { specialization }),
          ...(yearsOfExperience && { yearsOfExperience: parseInt(yearsOfExperience) }),
          ...(organization && { organization }),
          ...(bio && { bio }),
        },
      });

      console.log('✅ User created:', { id: user.id, role: user.role, verificationStatus: user.verificationStatus });

      // 🎯 Register FCM token if provided (async, don't block registration)
      if (fcmToken && device) {
        this.fcmTokenService.registerToken(user.id, normalizedEmail, {
          fcmToken,
          device: device as any,
        }).then(() => {
          this.logger.log(`✅ FCM token registered for new user ${user.id} on device ${device}`);
        }).catch((error) => {
          this.logger.error(`❌ Failed to register FCM token during registration: ${error.message}`);
        });
      }

      // 🎯 EMAIL TRIGGERS START
      this.sendWelcomeEmail(user, verificationStatus)
        .catch(error => {
          this.logger.error('Failed to send welcome email:', error);
        });

      if (verificationStatus === 'PENDING') {
        this.notifyAdminOfPendingVerification(user)
          .catch(error => {
            this.logger.error('Failed to send admin notification:', error);
          });
      }
      // 🎯 EMAIL TRIGGERS END

      this.eventEmitter.emit('user.welcome', {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      // Generate tokens (include role and verificationStatus in payload)
      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,  // ✅ Include role in token
          verificationStatus: user.verificationStatus  // ✅ Include status in token
        },
        { secret: this.configService.get('JWT_SECRET'), expiresIn: '15m' },
      );

      const refreshToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET') ||
            this.configService.get('JWT_SECRET'),
          expiresIn: '7d'
        },
      );

      return {
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,  // ✅ Return role
          verificationStatus: user.verificationStatus,  // ✅ Return status
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('❌ Registration error:', error.message);
      throw error;
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMemberships: {
          include: {
            organization: true,
          },
        },
      },
    });


    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    console.log('🔍 getProfile - userId:', userId);
    console.log('🔍 getProfile - organizationMemberships:', user.organizationMemberships);
    console.log('🔍 getProfile - memberships count:', user.organizationMemberships?.length);

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateAuthProfileDto) {
    const updatedUser = await this.usersService.update(userId, updateProfileDto);

    // Remove password from the response if it exists
    if ('password' in updatedUser) {
      const { password, ...userWithoutPassword } = updatedUser as any;
      return userWithoutPassword;
    }

    return updatedUser;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.password) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, { password: hashedPassword });

    this.eventEmitter.emit('security.alert', {
      userId,
      type: 'PASSWORD_CHANGED',
      message: 'Your password was successfully changed.',
      timestamp: new Date(),
    });

    return { message: 'Password changed successfully' };
  }

  // ✅ Change from Partial<User> to a specific type
  private generateTokens(user: {
    id: string;
    email: string;
    role: Role;
    verificationStatus: VerificationStatus;
    name?: string;
    avatar?: string;
    bio?: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      verificationStatus: user.verificationStatus,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // ✅ CRITICAL: Return user object along with tokens
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        verificationStatus: user.verificationStatus,
        avatar: user.avatar,
        bio: user.bio,
      },
    };
  }

  // In auth.service.ts
  async findUserByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email }
    });
  }

  async generateCaptcha(): Promise<{ text: string; image: string }> {
    const captcha = svgCaptcha.create({
      size: 6, // Number of characters
      noise: 3, // Number of noise lines  
      color: true, // Use colors
      background: '#f0f0f0', // Background color
      width: 200,
      height: 60,
      fontSize: 50,
      charPreset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // Exclude confusing characters
    });

    // Convert SVG to base64 data URL so frontend can display it
    const base64Image = `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`;

    return {
      text: captcha.text,
      image: base64Image,
    };
  }

  //forgot password
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const randomBytes = promisify(rb);
    const resetToken = (await randomBytes(32)).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    // Save token to database
    await this.usersService.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpiry: resetTokenExpiry,
    });

    // Send password reset email
    this.emailService
      .sendPasswordResetEmail(user.email, resetToken, user.name ?? undefined)
      .catch(error => {
        console.error('Failed to send password reset email:', error);
      });

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async verifyResetToken(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: {
          gte: new Date(), // Token hasn't expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return { message: 'Token is valid' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: {
          gte: new Date(), // Token hasn't expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    });
    this.sendPasswordChangedEmail(user.email, user.name ?? undefined)
      .catch(error => {
        console.error('Failed to send password changed email:', error);
      });
    return { message: 'Password has been reset successfully' };
  }

  /**
 * 🎯 Send welcome email based on user role and verification status
 */
  private async sendWelcomeEmail(
    user: any,
    verificationStatus: string
  ): Promise<void> {
    const isProfessional = ['THERAPIST', 'EDUCATOR', 'ORGANIZATION'].includes(user.role);

    if (verificationStatus === 'PENDING' && isProfessional) {
      await this.sendProfessionalWelcomeEmail(
        user.email,
        user.name,
        user.role
      );
    } else {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.name
      );
    }

    this.logger.log(`✓ Welcome email sent to ${user.email}`);
  }

  /**
   * Send welcome email for professionals awaiting verification
   */
  async sendProfessionalWelcomeEmail(
    email: string,
    userName: string,
    role: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const roleNames = {
      THERAPIST: 'Therapist',
      EDUCATOR: 'Educator',
      ORGANIZATION: 'Organization'
    };

    const roleName = roleNames[role] || 'Professional';

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .badge { background: rgba(255, 255, 255, 0.2); padding: 8px 20px; border-radius: 20px; color: white; margin-top: 10px; display: inline-block; }
          .content { padding: 40px; }
          .info-box { background: #EBF8FF; border-left: 4px solid #4299E1; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%); color: white; text-decoration: none; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Upllyft! 🎉</h1>
            <div class="badge">${roleName} Account</div>
          </div>
          <div class="content">
            <p style="font-size: 18px; font-weight: 600;">Hi ${userName},</p>
            <p>Thank you for registering as a ${roleName.toLowerCase()} on Upllyft!</p>
            <div class="info-box">
              <strong>⏳ Account Verification in Progress</strong><br><br>
              Your account is under review. We'll verify your credentials within 24-48 hours. 
              You'll receive an email once verified.
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}/dashboard" class="button">Go to Dashboard</a>
            </div>
            <p style="font-size: 14px; color: #718096;">
              Need help? Contact us at <a href="mailto:support@upllyft.com">support@upllyft.com</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

    const result = await this.emailService.sendEmail({
      to: email,
      subject: `Welcome to Upllyft - ${roleName} Account Verification`,
      html,
    });
    return result.success;
  }

  /**
   * 🎯 Notify admin about new professional requiring verification
   */
  private async notifyAdminOfPendingVerification(user: any): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');

    if (!adminEmail) {
      this.logger.warn('Admin email not configured');
      return;
    }

    await this.sendAdminAlert(
      'New Professional Account Pending Verification',
      `A new ${user.role} account requires verification`,
      {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        licenseNumber: user.licenseNumber,
        specialization: user.specialization,
        organization: user.organization,
        yearsOfExperience: user.yearsOfExperience,
        registeredAt: new Date().toISOString(),
      }
    );

    this.logger.log(`✓ Admin notification sent for user ${user.email}`);
  }

  /**
   * Send admin notification email
   */
  async sendAdminAlert(
    subject: string,
    message: string,
    details?: Record<string, any>,
  ): Promise<boolean> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');

    if (!adminEmail) {
      this.logger.warn('Admin email not configured');
      return false;
    }

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; }
          h2 { color: #2D3748; border-bottom: 2px solid #4FD1C5; padding-bottom: 10px; }
          .message { color: #4A5568; font-size: 15px; line-height: 1.6; margin: 20px 0; }
          .details { background: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 20px; margin: 20px 0; }
          .details h3 { margin-top: 0; color: #2D3748; font-size: 16px; }
          .details table { width: 100%; border-collapse: collapse; }
          .details td { padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
          .details td:first-child { font-weight: 600; color: #4A5568; width: 40%; }
          .details td:last-child { color: #2D3748; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0; color: #A0AEC0; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🔔 ${subject}</h2>
          <div class="message">
            <p>${message}</p>
          </div>
          ${details ? `
            <div class="details">
              <h3>Details:</h3>
              <table>
                ${Object.entries(details).map(([key, value]) => `
                  <tr>
                    <td>${key}:</td>
                    <td>${value}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}
          <div class="footer">
            This is an automated notification from Upllyft
          </div>
        </div>
      </body>
    </html>
  `;

    const result = await this.emailService.sendEmail({
      to: adminEmail,
      subject: `[Upllyft Admin] ${subject}`,
      html,
    });
    return result.success;
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Upllyft</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            font-size: 32px;
            font-weight: 600;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px 40px 30px 40px;
            color: #2D3748;
          }
          .greeting {
            font-size: 16px;
            font-weight: 400;
            color: #2D3748;
            margin: 0 0 24px 0;
          }
          .message {
            font-size: 15px;
            line-height: 1.6;
            color: #4A5568;
            margin: 0 0 30px 0;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .reset-button {
            display: inline-block;
            padding: 14px 40px;
            background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 2px 4px rgba(79, 209, 197, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .reset-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(79, 209, 197, 0.4);
          }
          .link-section {
            margin: 30px 0;
          }
          .link-section p {
            font-size: 14px;
            color: #718096;
            margin: 0 0 12px 0;
          }
          .reset-link-box {
            background-color: #F7FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 16px;
            word-break: break-all;
            font-size: 13px;
            color: #4299E1;
            font-family: 'Courier New', monospace;
            line-height: 1.5;
          }
          .warning-box {
            margin: 30px 0;
            padding: 18px;
            background-color: #FFFBEB;
            border-left: 4px solid #F59E0B;
            border-radius: 6px;
          }
          .warning-box strong {
            color: #92400E;
            display: block;
            margin-bottom: 8px;
            font-size: 15px;
          }
          .warning-box p {
            margin: 0;
            font-size: 14px;
            color: #78350F;
            line-height: 1.5;
          }
          .footer {
            padding: 30px 40px 40px 40px;
            color: #718096;
            font-size: 14px;
          }
          .footer-signature {
            margin: 0 0 30px 0;
            font-size: 14px;
            color: #718096;
          }
          .team-name {
            color: #38B2AC;
            font-weight: 600;
          }
          .copyright {
            padding-top: 30px;
            border-top: 1px solid #E2E8F0;
            text-align: center;
            font-size: 12px;
            color: #A0AEC0;
          }
          @media only screen and (max-width: 600px) {
            .email-wrapper {
              margin: 20px;
              border-radius: 8px;
            }
            .content {
              padding: 30px 25px;
            }
            .footer {
              padding: 25px 25px 30px 25px;
            }
            .header h1 {
              font-size: 28px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <!-- Header -->
          <div class="header">
            <h1>Upllyft</h1>
          </div>
          
          <!-- Content -->
          <div class="content">
            <p class="greeting">Hi ${userName || 'there'},</p>
            
            <p class="message">
              We received a request to reset your password for your Upllyft account. Click the button below to create a new password:
            </p>
            
            <!-- Reset Password Button -->
            <div class="button-container">
              <a href="${resetLink}" class="reset-button">Reset Password</a>
            </div>
            
            <!-- Alternative Link -->
            <div class="link-section">
              <p>Or copy and paste this link into your browser:</p>
              <div class="reset-link-box">${resetLink}</div>
            </div>
            
            <!-- Warning Box -->
            <div class="warning-box">
              <strong>Important:</strong>
              <p>This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p class="footer-signature">
              Best regards,<br>
              <span class="team-name">The Upllyft Team</span>
            </p>
            
            <div class="copyright">
              © ${new Date().getFullYear()} Upllyft. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

    const text = `
Reset Your Password - Upllyft

Hi ${userName || 'there'},

We received a request to reset your password for your Upllyft account. Click the link below to create a new password:

${resetLink}

IMPORTANT:
This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The Upllyft Team

© ${new Date().getFullYear()} Upllyft. All rights reserved.
  `;

    const result = await this.emailService.sendEmail({
      to: email,
      subject: 'Reset Your Password - Upllyft',
      html,
      text,
    });
    return result.success;
  }


  async sendPasswordChangedEmail(
    email: string,
    userName?: string,
  ): Promise<boolean> {
    const supportEmail = this.configService.get<string>('SUPPORT_EMAIL', 'support@upllyft.com');
    const changeDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed - Upllyft</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            font-size: 32px;
            font-weight: 600;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px 40px 30px 40px;
            color: #2D3748;
          }
          .greeting {
            font-size: 16px;
            font-weight: 400;
            color: #2D3748;
            margin: 0 0 24px 0;
          }
          .message {
            font-size: 15px;
            line-height: 1.6;
            color: #4A5568;
            margin: 0 0 30px 0;
          }
          .success-icon {
            text-align: center;
            margin: 30px 0;
          }
          .success-icon span {
            display: inline-block;
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%);
            border-radius: 50%;
            line-height: 80px;
            font-size: 40px;
            color: white;
          }
          .info-box {
            margin: 30px 0;
            padding: 18px;
            background-color: #EBF8FF;
            border-left: 4px solid #4299E1;
            border-radius: 6px;
          }
          .info-box strong {
            color: #2C5282;
            display: block;
            margin-bottom: 8px;
            font-size: 15px;
          }
          .info-box p {
            margin: 0;
            font-size: 14px;
            color: #2C5282;
            line-height: 1.5;
          }
          .info-box a {
            color: #3182CE;
            text-decoration: none;
            font-weight: 600;
          }
          .timestamp-box {
            margin: 30px 0;
            padding: 16px;
            background-color: #F7FAFC;
            border-radius: 6px;
            border: 1px solid #E2E8F0;
          }
          .timestamp-box strong {
            color: #2D3748;
            font-size: 14px;
          }
          .timestamp-box span {
            color: #4A5568;
            font-size: 14px;
            margin-left: 8px;
          }
          .footer {
            padding: 30px 40px 40px 40px;
            color: #718096;
            font-size: 14px;
          }
          .footer-signature {
            margin: 0 0 30px 0;
            font-size: 14px;
            color: #718096;
          }
          .team-name {
            color: #38B2AC;
            font-weight: 600;
          }
          .copyright {
            padding-top: 30px;
            border-top: 1px solid #E2E8F0;
            text-align: center;
            font-size: 12px;
            color: #A0AEC0;
          }
          @media only screen and (max-width: 600px) {
            .email-wrapper {
              margin: 20px;
              border-radius: 8px;
            }
            .content {
              padding: 30px 25px;
            }
            .footer {
              padding: 25px 25px 30px 25px;
            }
            .header h1 {
              font-size: 28px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <!-- Header -->
          <div class="header">
            <h1>Upllyft</h1>
          </div>
          
          <!-- Content -->
          <div class="content">
            <p class="greeting">Hi ${userName || 'there'},</p>
            
            <div class="success-icon">
              <span>🔒</span>
            </div>
            
            <p class="message">
              This is a confirmation that your password has been successfully changed for your Upllyft account.
            </p>
            
            <!-- Timestamp -->
            <div class="timestamp-box">
              <strong>Changed:</strong>
              <span>${changeDate}</span>
            </div>
            
            <!-- Info Box -->
            <div class="info-box">
              <strong>Security tip:</strong>
              <p>If you didn't make this change, please contact our support team immediately at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p class="footer-signature">
              Best regards,<br>
              <span class="team-name">The Upllyft Team</span>
            </p>
            
            <div class="copyright">
              © ${new Date().getFullYear()} Upllyft. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

    const text = `
Password Changed - Upllyft

Hi ${userName || 'there'},

This is a confirmation that your password has been successfully changed for your Upllyft account.

Changed: ${changeDate}

Security tip: If you didn't make this change, please contact our support team immediately at ${supportEmail}

Best regards,
The Upllyft Team

© ${new Date().getFullYear()} Upllyft. All rights reserved.
  `;

    const result = await this.emailService.sendEmail({
      to: email,
      subject: 'Your Password Has Been Changed - Upllyft',
      html,
      text,
    });
    return result.success;
  }


}

