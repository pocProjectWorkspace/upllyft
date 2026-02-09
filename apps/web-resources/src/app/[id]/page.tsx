'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Textarea,
  Separator,
  toast,
} from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import {
  useWorksheet,
  useWorksheetStatus,
  useUpdateWorksheet,
  useDeleteWorksheet,
  usePublishWorksheet,
  useUnpublishWorksheet,
  useCloneWorksheet,
  useAssignWorksheet,
  useLinkWorksheetToCase,
  useCreateVersion,
  useReviews,
  useCreateReview,
  useDeleteReview,
  useMarkReviewHelpful,
  useWorksheetEffectiveness,
  useVersionHistory,
} from '@/hooks/use-worksheets';
import { downloadWorksheetPdf } from '@/lib/api/worksheets';
import {
  worksheetTypeLabels,
  worksheetStatusLabels,
  worksheetStatusColors,
  difficultyLabels,
  difficultyColors,
  subTypeLabels,
  formatDate,
  formatRelativeDate,
  renderStars,
} from '@/lib/utils';

export default function WorksheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const { data: worksheet, isLoading, error } = useWorksheet(id);
  const { data: statusData } = useWorksheetStatus(id, worksheet?.status === 'GENERATING');

  const updateMutation = useUpdateWorksheet();
  const deleteMutation = useDeleteWorksheet();
  const publishMutation = usePublishWorksheet();
  const unpublishMutation = useUnpublishWorksheet();
  const cloneMutation = useCloneWorksheet();
  const assignMutation = useAssignWorksheet();
  const linkCaseMutation = useLinkWorksheetToCase();
  const createVersionMutation = useCreateVersion();
  const createReviewMutation = useCreateReview();
  const deleteReviewMutation = useDeleteReview();
  const markHelpfulMutation = useMarkReviewHelpful();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [linkCaseOpen, setLinkCaseOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ assignedToId: '', childId: '', dueDate: '', notes: '' });
  const [caseIdValue, setCaseIdValue] = useState('');
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const { data: reviewsData } = useReviews(id, reviewPage);
  const { data: effectiveness } = useWorksheetEffectiveness(id);
  const { data: versions } = useVersionHistory(id);

  const isOwner = user?.id === worksheet?.createdById;
  const currentStatus = statusData?.status || worksheet?.status;

  if (isLoading) {
    return (
      <ResourcesShell>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ResourcesShell>
    );
  }

  if (error || !worksheet) {
    return (
      <ResourcesShell>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900">Worksheet not found</h2>
          <p className="text-gray-500 mt-2">The worksheet you are looking for does not exist or you do not have access.</p>
          <Button className="mt-4" onClick={() => router.push('/')}>Back to Library</Button>
        </div>
      </ResourcesShell>
    );
  }

  function handleTitleSave() {
    if (titleValue.trim() && titleValue !== worksheet!.title) {
      updateMutation.mutate({ id, data: { title: titleValue.trim() } });
    }
    setEditingTitle(false);
  }

  function handleDelete() {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push('/');
      },
    });
  }

  function handleAssign() {
    if (!assignForm.assignedToId || !assignForm.childId) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    assignMutation.mutate(
      {
        worksheetId: id,
        data: {
          assignedToId: assignForm.assignedToId,
          childId: assignForm.childId,
          dueDate: assignForm.dueDate || undefined,
          notes: assignForm.notes || undefined,
        },
      },
      { onSuccess: () => { setAssignOpen(false); setAssignForm({ assignedToId: '', childId: '', dueDate: '', notes: '' }); } },
    );
  }

  function handleLinkCase() {
    if (!caseIdValue.trim()) return;
    linkCaseMutation.mutate(
      { worksheetId: id, caseId: caseIdValue.trim() },
      { onSuccess: () => { setLinkCaseOpen(false); setCaseIdValue(''); } },
    );
  }

  function handleSubmitReview() {
    createReviewMutation.mutate(
      { worksheetId: id, data: { rating: reviewRating, reviewText: reviewText || undefined } },
      { onSuccess: () => { setReviewRating(5); setReviewText(''); } },
    );
  }

  const content = worksheet.content as Record<string, unknown>;
  const activities = (content?.activities || content?.sections || content?.items || []) as Array<Record<string, unknown>>;

  return (
    <ResourcesShell>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 text-gray-500">
          &larr; Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{worksheet.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge color={worksheetStatusColors[currentStatus as keyof typeof worksheetStatusColors] as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}>
                {worksheetStatusLabels[currentStatus as keyof typeof worksheetStatusLabels]}
              </Badge>
              <Badge color={difficultyColors[worksheet.difficulty] as 'green' | 'blue' | 'purple'}>
                {difficultyLabels[worksheet.difficulty]}
              </Badge>
              <Badge color="gray">
                {worksheetTypeLabels[worksheet.type]}
                {worksheet.subType ? ` - ${subTypeLabels[worksheet.subType] || worksheet.subType}` : ''}
              </Badge>
              {worksheet.isPublic && <Badge color="blue">Community</Badge>}
            </div>
          </div>

          {worksheet.createdBy && (
            <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
              <Avatar src={worksheet.createdBy.image || undefined} name={worksheet.createdBy.name} size="sm" />
              <div>
                <p className="font-medium text-gray-700">{worksheet.createdBy.name}</p>
                <p>{formatDate(worksheet.createdAt)}</p>
              </div>
            </div>
          )}
        </div>

        {worksheet.child && (
          <p className="text-sm text-gray-500 mt-2">
            For: <span className="font-medium text-gray-700">{worksheet.child.nickname || worksheet.child.firstName}</span>
          </p>
        )}

        {worksheet.averageRating > 0 && (
          <p className="text-sm text-amber-600 mt-1">
            {renderStars(worksheet.averageRating)} ({worksheet.reviewCount} {worksheet.reviewCount === 1 ? 'review' : 'reviews'})
          </p>
        )}
      </div>

      <Separator className="mb-6" />

      {/* Tabs */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-6">
          {currentStatus === 'GENERATING' ? (
            <Card className="p-8 text-center">
              <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Generating worksheet...</h3>
              <p className="text-gray-500 mt-1">AI is creating your content, images, and PDF. This usually takes 30-60 seconds.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {typeof content?.title === 'string' && (
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 text-lg">{content.title}</h3>
                  {typeof content?.description === 'string' && <p className="text-gray-600 mt-2">{content.description}</p>}
                  {typeof content?.instructions === 'string' && <p className="text-gray-500 mt-2 text-sm italic">{content.instructions}</p>}
                </Card>
              )}

              {activities.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Activities / Sections</h3>
                  {activities.map((item, idx) => (
                    <Card key={idx} className="p-4">
                      <h4 className="font-medium text-gray-800">
                        {String(item.title || item.name || item.label || `Section ${idx + 1}`)}
                      </h4>
                      {typeof item.description === 'string' && <p className="text-gray-600 text-sm mt-1">{item.description}</p>}
                      {typeof item.instructions === 'string' && <p className="text-gray-500 text-sm mt-1">{item.instructions}</p>}
                      {Array.isArray(item.steps) && (
                        <ul className="list-disc list-inside mt-2 text-sm text-gray-600 space-y-1">
                          {(item.steps as unknown[]).map((step, sIdx) => (
                            <li key={sIdx}>{typeof step === 'string' ? step : JSON.stringify(step)}</li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {worksheet.images && worksheet.images.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Illustrations</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {worksheet.images.map((img) => (
                      <Card key={img.id} className="overflow-hidden">
                        {img.status === 'COMPLETED' ? (
                          <img src={img.imageUrl} alt={img.altText} className="w-full h-48 object-cover" />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                            {img.status === 'GENERATING' ? (
                              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <p className="text-sm text-gray-400">{img.status === 'FAILED' ? 'Failed' : 'Pending'}</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 p-2 truncate">{img.altText}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="mt-6">
          <div className="space-y-6">
            {/* Download */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Download</h3>
              <p className="text-sm text-gray-500 mb-4">Download the print-ready PDF version of this worksheet.</p>
              <Button
                onClick={() => downloadWorksheetPdf(worksheet.id, worksheet.title, worksheet.pdfUrl)}
                disabled={currentStatus !== 'PUBLISHED'}
              >
                Download PDF
              </Button>
            </Card>

            {/* Edit Title */}
            {isOwner && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Edit Title</h3>
                {editingTitle ? (
                  <div className="flex gap-2">
                    <Input
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleTitleSave} disabled={updateMutation.isPending}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-gray-700">{worksheet.title}</p>
                    <Button size="sm" variant="ghost" onClick={() => { setTitleValue(worksheet.title); setEditingTitle(true); }}>Edit</Button>
                  </div>
                )}
              </Card>
            )}

            {/* Publish / Unpublish */}
            {isOwner && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Community Sharing</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {worksheet.isPublic
                    ? 'This worksheet is published to the community library.'
                    : 'Share this worksheet with the community.'}
                </p>
                {worksheet.isPublic ? (
                  <Button
                    variant="outline"
                    onClick={() => unpublishMutation.mutate(id)}
                    disabled={unpublishMutation.isPending}
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    onClick={() => publishMutation.mutate({ worksheetId: id })}
                    disabled={publishMutation.isPending || currentStatus !== 'PUBLISHED'}
                  >
                    Publish to Community
                  </Button>
                )}
              </Card>
            )}

            {/* Clone */}
            {worksheet.isPublic && !isOwner && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Clone Worksheet</h3>
                <p className="text-sm text-gray-500 mb-4">Create a copy in your personal library.</p>
                <Button onClick={() => cloneMutation.mutate(id)} disabled={cloneMutation.isPending}>
                  Clone to My Library
                </Button>
              </Card>
            )}

            {/* Assign as Homework */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Assign as Homework</h3>
              <p className="text-sm text-gray-500 mb-4">Send this worksheet to a parent as homework.</p>
              <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Assign</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Worksheet</DialogTitle>
                    <DialogDescription>Send &quot;{worksheet.title}&quot; as homework.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Assign to (User ID)</Label>
                      <Input
                        placeholder="User ID"
                        value={assignForm.assignedToId}
                        onChange={(e) => setAssignForm((f) => ({ ...f, assignedToId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Child ID</Label>
                      <Input
                        placeholder="Child ID"
                        value={assignForm.childId}
                        onChange={(e) => setAssignForm((f) => ({ ...f, childId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Due Date (optional)</Label>
                      <Input
                        type="date"
                        value={assignForm.dueDate}
                        onChange={(e) => setAssignForm((f) => ({ ...f, dueDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Add instructions for the parent..."
                        value={assignForm.notes}
                        onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={assignMutation.isPending}>
                      {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>

            {/* Link to Case */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Link to Case</h3>
              <p className="text-sm text-gray-500 mb-4">Associate this worksheet with a clinical case.</p>
              <Dialog open={linkCaseOpen} onOpenChange={setLinkCaseOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Link to Case</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link to Case</DialogTitle>
                    <DialogDescription>Enter the case ID to link this worksheet.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label>Case ID</Label>
                    <Input
                      placeholder="Enter case ID"
                      value={caseIdValue}
                      onChange={(e) => setCaseIdValue(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setLinkCaseOpen(false)}>Cancel</Button>
                    <Button onClick={handleLinkCase} disabled={linkCaseMutation.isPending}>
                      {linkCaseMutation.isPending ? 'Linking...' : 'Link'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {worksheet.caseId && (
                <p className="text-sm text-teal-600 mt-2">Linked to case: {worksheet.caseId}</p>
              )}
            </Card>

            {/* New Version */}
            {isOwner && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Version Control</h3>
                <p className="text-sm text-gray-500 mb-4">Create a new version of this worksheet (v{worksheet.version}).</p>
                <Button
                  variant="outline"
                  onClick={() => createVersionMutation.mutate(id)}
                  disabled={createVersionMutation.isPending}
                >
                  Create New Version
                </Button>
              </Card>
            )}

            {/* Delete */}
            {isOwner && (
              <Card className="p-6 border-red-200">
                <h3 className="font-semibold text-red-700 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">Permanently archive this worksheet. This action cannot be undone.</p>
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Delete Worksheet</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Worksheet</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete &quot;{worksheet.title}&quot;? This will archive the worksheet.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete} disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6">
          <div className="space-y-6">
            {/* Submit Review */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>
              <div className="space-y-3">
                <div>
                  <Label>Rating</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-2xl ${star <= reviewRating ? 'text-amber-400' : 'text-gray-300'} hover:text-amber-400 transition-colors`}
                      >
                        &#9733;
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Review (optional)</Label>
                  <Textarea
                    placeholder="Share your experience with this worksheet..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleSubmitReview} disabled={createReviewMutation.isPending} size="sm">
                  {createReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </Card>

            <Separator />

            {/* Reviews List */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Reviews {reviewsData?.total ? `(${reviewsData.total})` : ''}
              </h3>
              {!reviewsData?.data?.length ? (
                <p className="text-gray-500 text-sm">No reviews yet. Be the first to review.</p>
              ) : (
                <div className="space-y-4">
                  {reviewsData.data.map((review) => (
                    <Card key={review.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar src={review.user?.image || undefined} name={review.user?.name || 'User'} size="sm" />
                          <div>
                            <p className="font-medium text-sm text-gray-900">{review.user?.name}</p>
                            <p className="text-xs text-gray-500">{formatRelativeDate(review.createdAt)}</p>
                          </div>
                        </div>
                        <span className="text-amber-500 text-sm">{renderStars(review.rating)}</span>
                      </div>
                      {review.reviewText && <p className="text-sm text-gray-600 mt-2">{review.reviewText}</p>}
                      <div className="flex items-center gap-3 mt-3">
                        <button
                          type="button"
                          onClick={() => markHelpfulMutation.mutate({ worksheetId: id, reviewId: review.id })}
                          className="text-xs text-gray-500 hover:text-teal-600 transition-colors"
                        >
                          Helpful ({review.helpfulCount})
                        </button>
                        {review.userId === user?.id && (
                          <button
                            type="button"
                            onClick={() => deleteReviewMutation.mutate({ worksheetId: id, reviewId: review.id })}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}

                  {reviewsData.totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                        disabled={reviewPage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500 py-2">
                        Page {reviewPage} of {reviewsData.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewPage((p) => p + 1)}
                        disabled={reviewPage >= reviewsData.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            {/* Effectiveness Score */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Effectiveness Score</h3>
              {effectiveness ? (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl font-bold text-teal-600">
                      {Math.round(effectiveness.score * 100)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      Based on {effectiveness.sampleSize} {effectiveness.sampleSize === 1 ? 'completion' : 'completions'}
                    </div>
                  </div>
                  {effectiveness.domains.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Domain Progress</h4>
                      {effectiveness.domains.map((d) => (
                        <div key={d.domain} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{d.domain}</span>
                          <span className={d.progressDelta >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {d.progressDelta >= 0 ? '+' : ''}{d.progressDelta.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No effectiveness data available yet.</p>
              )}
            </Card>

            {/* Version History */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Version History {versions ? `(${versions.totalVersions} versions)` : ''}
              </h3>
              {versions?.versions.length ? (
                <div className="space-y-3">
                  {versions.versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">v{v.version} - {v.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(v.createdAt)}</p>
                      </div>
                      <Badge
                        color={worksheetStatusColors[v.status] as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}
                      >
                        {worksheetStatusLabels[v.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No version history available.</p>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </ResourcesShell>
  );
}
