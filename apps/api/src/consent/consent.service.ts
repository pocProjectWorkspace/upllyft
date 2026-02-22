import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';
import { SendConsentDto } from './dto/send-consent.dto';
import * as docusign from 'docusign-esign';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationService: NotificationService,
    private auditService: AuditService,
  ) {}

  private async getDocuSignApiClient(): Promise<docusign.ApiClient> {
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(
      this.configService.get<string>(
        'DOCUSIGN_BASE_PATH',
        'https://demo.docusign.net/restapi',
      ),
    );

    const privateKey = this.configService
      .get<string>('DOCUSIGN_PRIVATE_KEY', '')
      .replace(/\\n/g, '\n');

    const results = await apiClient.requestJWTUserToken(
      this.configService.get<string>('DOCUSIGN_INTEGRATION_KEY', ''),
      this.configService.get<string>('DOCUSIGN_USER_ID', ''),
      ['signature', 'impersonation'],
      Buffer.from(privateKey),
      3600,
    );

    apiClient.addDefaultHeader(
      'Authorization',
      `Bearer ${results.body.access_token}`,
    );

    return apiClient;
  }

  async sendConsentForm(sentById: string, dto: SendConsentDto) {
    let envelopeId: string | undefined;

    try {
      const apiClient = await this.getDocuSignApiClient();
      const envelopesApi = new docusign.EnvelopesApi(apiClient);
      const accountId = this.configService.get<string>(
        'DOCUSIGN_ACCOUNT_ID',
        '',
      );
      const templateId = this.configService.get<string>(
        'DOCUSIGN_TEMPLATE_ID',
        '',
      );

      const envelopeDefinition =
        new docusign.EnvelopeDefinition();
      envelopeDefinition.templateId = templateId;
      envelopeDefinition.status = 'sent';

      const signer = new docusign.TemplateRole();
      signer.email = dto.parentEmail;
      signer.name = dto.parentName;
      signer.roleName = 'Parent';
      signer.clientUserId = dto.patientId;
      signer.tabs = new docusign.Tabs();
      signer.tabs.textTabs = [
        Object.assign(new docusign.Text(), {
          tabLabel: 'ChildName',
          value: dto.patientName,
        }),
        Object.assign(new docusign.Text(), {
          tabLabel: 'ParentName',
          value: dto.parentName,
        }),
      ];

      envelopeDefinition.templateRoles = [signer];

      const result = await envelopesApi.createEnvelope(accountId, {
        envelopeDefinition,
      });
      envelopeId = result.envelopeId;
    } catch (error) {
      this.logger.error('DocuSign envelope creation failed', error);
      throw new InternalServerErrorException(
        'Failed to create DocuSign envelope. Please check your DocuSign configuration.',
      );
    }

    const consent = await this.prisma.consentForm.create({
      data: {
        patientId: dto.patientId,
        intakeId: dto.intakeId,
        envelopeId,
        status: 'SENT',
        sentAt: new Date(),
        sentBy: sentById,
      },
    });

    // Send in-app notification to parent
    try {
      await this.notificationService.createNotification({
        userId: dto.patientId,
        type: NotificationType.CONSENT_FORM_SENT,
        title: 'Action required',
        message: `Please sign the consent form for ${dto.patientName}'s therapy.`,
        actionUrl: `/consent/${consent.id}`,
        relatedEntityId: consent.id,
        relatedEntityType: 'case',
        priority: 'high',
      });

      // Also send direct push via FCM (DeviceToken)
      await this.notificationService.sendToUser(dto.patientId, {
        title: 'Action required',
        body: `Please sign the consent form for ${dto.patientName}'s therapy.`,
        data: { type: 'consent', consentId: consent.id },
      });
    } catch (error) {
      this.logger.error('Failed to send consent notification', error);
    }

    return consent;
  }

  async getSigningUrl(consentId: string, userId: string) {
    const consent = await this.prisma.consentForm.findUnique({
      where: { id: consentId },
    });

    if (!consent) {
      throw new NotFoundException('Consent form not found');
    }

    if (consent.patientId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this consent form',
      );
    }

    // PDPL: Audit consent form access
    this.auditService.log({
      userId,
      resourceType: 'ConsentForm',
      resourceId: consentId,
      action: 'READ',
    });

    if (consent.status === 'SIGNED') {
      return { alreadySigned: true };
    }

    try {
      const apiClient = await this.getDocuSignApiClient();
      const envelopesApi = new docusign.EnvelopesApi(apiClient);
      const accountId = this.configService.get<string>(
        'DOCUSIGN_ACCOUNT_ID',
        '',
      );
      const webMainUrl = this.configService.get<string>(
        'WEB_MAIN_URL',
        'http://localhost:3000',
      );

      const viewRequest = new docusign.RecipientViewRequest();
      viewRequest.returnUrl = `${webMainUrl}/consent/complete?consentId=${consentId}`;
      viewRequest.authenticationMethod = 'none';
      viewRequest.clientUserId = userId;
      viewRequest.recipientId = '1';
      viewRequest.email = (
        await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })
      )?.email;
      viewRequest.userName = (
        await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        })
      )?.name;

      const result = await envelopesApi.createRecipientView(accountId, consent.envelopeId!, {
        recipientViewRequest: viewRequest,
      });

      return { signingUrl: result.url };
    } catch (error) {
      this.logger.error('Failed to create DocuSign signing URL', error);
      throw new InternalServerErrorException(
        'Failed to generate signing URL. Please try again later.',
      );
    }
  }

  async getPatientConsents(patientId: string) {
    return this.prisma.consentForm.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleWebhook(payload: any) {
    const envelopeId = payload?.envelopeId || payload?.EnvelopeID;
    const status = (
      payload?.status ||
      payload?.Status ||
      ''
    ).toLowerCase();

    if (!envelopeId) {
      return { received: true };
    }

    const statusMap: Record<string, string> = {
      completed: 'SIGNED',
      declined: 'DECLINED',
      voided: 'EXPIRED',
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      return { received: true };
    }

    try {
      await this.prisma.consentForm.updateMany({
        where: { envelopeId },
        data: {
          status: mappedStatus as any,
          ...(mappedStatus === 'SIGNED' ? { signedAt: new Date() } : {}),
        },
      });
    } catch (error) {
      this.logger.error('Failed to update consent form from webhook', error);
    }

    return { received: true };
  }
}
