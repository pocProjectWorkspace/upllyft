'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, useToast } from '@upllyft/ui';
import { uploadTherapistCredential } from '@/lib/admin-api';
import { Loader2, X, Upload } from 'lucide-react';

interface UploadCredentialModalProps {
    therapistId: string;
    onClose: () => void;
}

export function UploadCredentialModal({ therapistId, onClose }: UploadCredentialModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [label, setLabel] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error('Please select a file');
            if (!label) throw new Error('Document label is required');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('label', label);
            if (expiresAt) {
                formData.append('expiresAt', new Date(expiresAt).toISOString());
            }
            return uploadTherapistCredential(therapistId, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['therapist-credentials', therapistId] });
            toast({
                title: 'Document uploaded',
                description: 'The credential document was uploaded successfully.',
                variant: 'success',
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: 'Upload failed',
                description: error.response?.data?.message || error.message || 'Failed to upload document',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        uploadMutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
                            <Upload className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Upload Credential</h2>
                            <p className="text-sm text-gray-500">Add a license or certification document</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 flex flex-col items-stretch">
                    <div>
                        <Label htmlFor="label">Document Label *</Label>
                        <Input
                            id="label"
                            placeholder="e.g. DHA License, Board Certification"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="mt-1.5"
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="file">File (PDF, JPG, PNG) *</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="mt-1.5"
                            required
                        />
                        {file && (
                            <p className="text-xs text-gray-500 mt-2">
                                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
                        <Input
                            id="expiresAt"
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            className="mt-1.5"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Leave blank if the document does not expire.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="bg-teal-600 hover:bg-teal-700"
                            disabled={uploadMutation.isPending || !file || !label}
                        >
                            {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload Document
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
