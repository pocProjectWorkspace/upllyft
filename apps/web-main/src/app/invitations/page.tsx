'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@upllyft/api-client';
import { AppHeader, Button, Card, useToast } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import {
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  type OrgInvitation,
} from '@/lib/api/organizations';

export default function InvitationsPage() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isAuthenticated) {
      loadInvitations();
    }
  }, [isAuthenticated]);

  const loadInvitations = async () => {
    try {
      setIsLoading(true);
      const data = await getMyInvitations();
      // Filter only pending invitations
      setInvitations(data.filter((inv) => inv.status === 'PENDING'));
    } catch (error) {
      console.error('Failed to load invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (token: string) => {
    try {
      setIsProcessing((prev) => ({ ...prev, [token]: true }));
      await acceptInvitation(token);
      toast({
        title: 'Success',
        description: 'You have successfully joined the organization.',
      });
      // Optionally reload auth user to update roles/org contexts, then redirect/reload
      router.push('/');
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to accept invitation.',
        variant: 'destructive',
      });
      setIsProcessing((prev) => ({ ...prev, [token]: false }));
    }
  };

  const handleDecline = async (token: string) => {
    try {
      setIsProcessing((prev) => ({ ...prev, [token]: true }));
      await declineInvitation(token);
      toast({
        title: 'Invitation Declined',
        description: 'You have declined the organization invitation.',
      });
      // Remove from list
      setInvitations((prev) => prev.filter((inv) => inv.token !== token));
    } catch (error: any) {
      console.error('Failed to decline invitation:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to decline invitation.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing((prev) => ({ ...prev, [token]: false }));
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Invitations</h1>
          <p className="text-gray-500 mt-1">
            Manage your pending organization invitations and collaboration requests.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-24 h-10 bg-gray-200 rounded" />
                    <div className="w-24 h-10 bg-gray-200 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📬</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No pending invitations</h3>
            <p className="text-gray-500">
              When you are invited to join an organization, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-bold text-xl shrink-0">
                    {invitation.organization?.name?.charAt(0) || 'O'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {invitation.organization?.name || 'Unknown Organization'}
                    </h3>
                    <p className="text-gray-500 mt-1 text-sm">
                      <span className="font-medium text-gray-700">
                        {invitation.invitedBy?.name || invitation.invitedBy?.email || 'Someone'}
                      </span>{' '}
                      invited you to join as a <span className="font-medium capitalize">{invitation.role.toLowerCase()}</span>.
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      Received {new Date(invitation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleDecline(invitation.token)}
                      disabled={isProcessing[invitation.token]}
                    >
                      Decline
                    </Button>
                    <Button
                      onClick={() => handleAccept(invitation.token)}
                      disabled={isProcessing[invitation.token]}
                    >
                      {isProcessing[invitation.token] ? 'Accepting...' : 'Accept Invite'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
