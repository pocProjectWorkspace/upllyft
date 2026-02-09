import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { format } from 'date-fns';

@Injectable()
export class GoogleMeetService {
    private readonly logger = new Logger(GoogleMeetService.name);
    private oauth2Client;
    private calendar;

    constructor(private config: ConfigService) {
        // Initialize OAuth2 client
        this.oauth2Client = new google.auth.OAuth2(
            this.config.get('GOOGLE_CLIENT_ID'),
            this.config.get('GOOGLE_CLIENT_SECRET'),
            this.config.get('GOOGLE_REDIRECT_URI'),
        );

        // Set credentials if available
        const refreshToken = this.config.get('GOOGLE_REFRESH_TOKEN');
        if (refreshToken) {
            this.oauth2Client.setCredentials({
                refresh_token: refreshToken,
            });
        }

        // Initialize Calendar API
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    /**
     * Create a Google Calendar event with Meet link
     */
    async createMeetingEvent(
        therapistEmail: string,
        patientEmail: string,
        patientName: string,
        therapistName: string,
        sessionTitle: string,
        startDateTime: Date,
        endDateTime: Date,
        timezone: string,
        bookingId: string,
    ) {
        try {
            const event = {
                summary: `${sessionTitle} - ${patientName} & ${therapistName}`,
                description: `Therapy session between ${patientName} and ${therapistName}.\n\nBooking ID: ${bookingId}`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: timezone,
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: timezone,
                },
                attendees: [
                    { email: therapistEmail, displayName: therapistName },
                    { email: patientEmail, displayName: patientName },
                ],
                conferenceData: {
                    createRequest: {
                        requestId: `booking-${bookingId}`,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet',
                        },
                    },
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 1 day before
                        { method: 'popup', minutes: 60 }, // 1 hour before
                        { method: 'popup', minutes: 15 }, // 15 minutes before
                    ],
                },
                guestsCanModify: false,
                guestsCanInviteOthers: false,
                guestsCanSeeOtherGuests: true,
            };

            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                conferenceDataVersion: 1,
                sendUpdates: 'all', // Send email to all attendees
                requestBody: event,
            });

            const meetLink = response.data.conferenceData?.entryPoints?.find(
                (entry) => entry.entryPointType === 'video',
            )?.uri;

            if (!meetLink) {
                this.logger.warn('Google Meet link not generated, using fallback');
                return {
                    meetLink: this.generateFallbackMeetLink(bookingId),
                    calendarEventId: response.data.id,
                };
            }

            this.logger.log(`Created Google Meet event ${response.data.id} for booking ${bookingId}`);

            return {
                meetLink,
                calendarEventId: response.data.id,
            };
        } catch (error) {
            this.logger.error(`Error creating Google Meet event: ${error.message}`);

            // Return fallback meet link
            return {
                meetLink: this.generateFallbackMeetLink(bookingId),
                calendarEventId: null,
            };
        }
    }

    /**
     * Update calendar event (e.g., when rescheduling)
     */
    async updateMeetingEvent(
        calendarEventId: string,
        startDateTime: Date,
        endDateTime: Date,
        timezone: string,
    ) {
        try {
            const response = await this.calendar.events.patch({
                calendarId: 'primary',
                eventId: calendarEventId,
                sendUpdates: 'all',
                requestBody: {
                    start: {
                        dateTime: startDateTime.toISOString(),
                        timeZone: timezone,
                    },
                    end: {
                        dateTime: endDateTime.toISOString(),
                        timeZone: timezone,
                    },
                },
            });

            this.logger.log(`Updated calendar event ${calendarEventId}`);

            return response.data;
        } catch (error) {
            this.logger.error(`Error updating calendar event: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cancel calendar event
     */
    async cancelMeetingEvent(calendarEventId: string, reason: string) {
        try {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId: calendarEventId,
                sendUpdates: 'all',
            });

            this.logger.log(`Cancelled calendar event ${calendarEventId}: ${reason}`);
        } catch (error) {
            this.logger.error(`Error cancelling calendar event: ${error.message}`);
            // Don't throw - cancellation should succeed even if calendar delete fails
        }
    }

    /**
     * Generate fallback meet link if Google Calendar API fails
     */
    private generateFallbackMeetLink(bookingId: string): string {
        // Generate a consistent meet code from booking ID
        const meetCode = bookingId.substring(0, 10).toLowerCase();
        return `https://meet.google.com/${meetCode}`;
    }

    /**
     * Get OAuth authorization URL for therapist onboarding
     */
    getAuthUrl(therapistId: string): string {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: therapistId, // Pass therapist ID in state
            prompt: 'consent', // Force consent screen to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokensFromCode(code: string) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            return tokens;
        } catch (error) {
            this.logger.error(`Error getting tokens: ${error.message}`);
            throw error;
        }
    }
}
