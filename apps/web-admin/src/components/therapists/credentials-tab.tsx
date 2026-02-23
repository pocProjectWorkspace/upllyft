'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge, useToast } from '@upllyft/ui';
import {
    getTherapistCredentials,
    getCredentialDownloadUrl,
    deleteTherapistCredential,
    type TherapistCredential
} from '@/lib/admin-api';
import { UploadCredentialModal } from './upload-credential-modal';
import { Loader2, Plus, FileText, Download, Trash2, ShieldAlert, ShieldCheck, FileKey, ExternalLink } from 'lucide-react';

interface CredentialsTabProps {
    therapistId: string;
}

export function CredentialsTab({ therapistId }: CredentialsTabProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data: credentials, isLoading } = useQuery({
        queryKey: ['therapist-credentials', therapistId],
        queryFn: () => getTherapistCredentials(therapistId),
    });

    const deleteMutation = useMutation({
        mutationFn: (credId: string) => deleteTherapistCredential(therapistId, credId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['therapist-credentials', therapistId] });
            toast({ title: 'Credential deleted', variant: 'success' });
            setDeletingId(null);
        },
        onError: (error: any) => {
            toast({
                title: 'Delete failed',
                description: error.response?.data?.message || 'Failed to delete credential',
                variant: 'destructive',
            });
            setDeletingId(null);
        }
    });

    const handleDownload = async (cred: TherapistCredential) => {
        try {
            setDownloadingId(cred.id);
            const { url } = await getCredentialDownloadUrl(therapistId, cred.id);
            // Open in new tab
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error: any) {
            toast({
                title: 'Download failed',
                description: error.response?.data?.message || 'Could not generate download link',
                variant: 'destructive',
            });
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = (id: string, label: string) => {
        if (window.confirm(`Are you sure you want to delete ${label}? This cannot be undone.`)) {
            setDeletingId(id);
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    const creds = credentials || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Professional Credentials</h2>
                    <p className="text-sm text-gray-500">
                        Manage license documents, certifications, and compliance records.
                    </p>
                </div>
                <Button
                    variant="primary"
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={() => setIsUploadModalOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                </Button>
            </div>

            <Card className="overflow-hidden border border-gray-200">
                {creds.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                            <FileKey className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900">No credentials found</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            Upload required compliance documents like DHA/HAAD licenses or degree certificates to track them here.
                        </p>
                        <Button
                            variant="outline"
                            className="mt-6 font-medium text-teal-600 border-teal-200 hover:bg-teal-50"
                            onClick={() => setIsUploadModalOpen(true)}
                        >
                            Upload First Credential
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {creds.map((cred) => {
                                    const isExpired = cred.expiresAt && new Date(cred.expiresAt) < new Date();

                                    return (
                                        <tr key={cred.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                                                        <FileText className="h-5 w-5 text-teal-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{cred.label}</p>
                                                        <p className="text-xs text-gray-500">{cred.fileName || 'Document'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(cred.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {cred.expiresAt ? new Date(cred.expiresAt).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isExpired ? (
                                                    <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
                                                        <ShieldAlert className="w-3 h-3 mr-1" /> Expired
                                                    </Badge>
                                                ) : cred.verified ? (
                                                    <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                                                        <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                                                        Valid
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-500 hover:text-teal-600 hover:bg-teal-50"
                                                        onClick={() => handleDownload(cred)}
                                                        disabled={downloadingId === cred.id || deletingId === cred.id}
                                                        title="Download / View"
                                                    >
                                                        {downloadingId === cred.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <ExternalLink className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDelete(cred.id, cred.label)}
                                                        disabled={deletingId === cred.id || downloadingId === cred.id}
                                                        title="Delete"
                                                    >
                                                        {deletingId === cred.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {isUploadModalOpen && (
                <UploadCredentialModal
                    therapistId={therapistId}
                    onClose={() => setIsUploadModalOpen(false)}
                />
            )}
        </div>
    );
}
