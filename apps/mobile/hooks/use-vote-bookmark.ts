import { useState, useCallback } from 'react';

import { votePost, bookmarkPost } from '../lib/api/community';

interface VoteBookmarkState {
  upvotes: number;
  downvotes: number;
  userVote: number | null;
  isBookmarked: boolean;
}

export function useVoteBookmark(
  postId: string,
  initial: VoteBookmarkState,
) {
  const [state, setState] = useState(initial);

  const toggleVote = useCallback(
    (value: 1 | -1) => {
      const prev = { ...state };
      setState((s) => {
        const newState = { ...s };
        if (s.userVote === value) {
          // remove vote
          newState.userVote = null;
          if (value === 1) newState.upvotes--;
          else newState.downvotes--;
        } else {
          // if switching vote
          if (s.userVote === 1) newState.upvotes--;
          if (s.userVote === -1) newState.downvotes--;
          newState.userVote = value;
          if (value === 1) newState.upvotes++;
          else newState.downvotes++;
        }
        return newState;
      });
      votePost(postId, value).catch(() => setState(prev));
    },
    [postId, state],
  );

  const toggleBookmark = useCallback(() => {
    const prev = { ...state };
    setState((s) => ({ ...s, isBookmarked: !s.isBookmarked }));
    bookmarkPost(postId).catch(() => setState(prev));
  }, [postId, state]);

  return { ...state, toggleVote, toggleBookmark };
}
