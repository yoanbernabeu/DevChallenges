export interface Participant {
    username: string;
    avatarUrl: string;
    url: string;
    body: string;
    issueNumber: number;
    title: string;
    stack?: string; // Optional, might be parsed from body
}

export interface IssueComment {
    id: number;
    username: string;
    avatarUrl: string;
    body: string;
    createdAt: string;
}

const REPO_OWNER = 'yoanbernabeu';
const REPO_NAME = 'DevChallenges';

// Cache configuration (1 minute = 60000 ms)
const CACHE_DURATION = 60 * 1000;
const CACHE_PREFIX = 'gh_cache_';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// Helper functions for sessionStorage cache
function getFromCache<T>(key: string): T | null {
    try {
        const cached = sessionStorage.getItem(CACHE_PREFIX + key);
        if (!cached) return null;
        
        const entry: CacheEntry<T> = JSON.parse(cached);
        if (Date.now() - entry.timestamp > CACHE_DURATION) {
            sessionStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
}

function setInCache<T>(key: string, data: T): void {
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
        };
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
        // sessionStorage might be full or disabled
    }
}

export async function getParticipants(tag: string): Promise<Participant[]> {
    // Check cache first
    const cached = getFromCache<Participant[]>(`participants_${tag}`);
    if (cached) {
        console.log(`[Cache] Using cached participants for ${tag}`);
        return cached;
    }

    try {
        // Search for issues with the specific tag in the title or body
        // GitHub Search API is powerful for this.
        // Query: repo:yoanbernabeu/DevChallenges is:issue label:WEEK-XX (if we used labels)
        // Or just search text if tags are in title/body as requested: "${tag}" in:title,body

        // The user requirement says: "checker sur les issues github avec le tag de la semaine"
        // and "Tag Requis" in modal is #WEEK-042.

        const query = encodeURIComponent(`repo:${REPO_OWNER}/${REPO_NAME} is:issue "${tag}"`);
        const response = await fetch(`https://api.github.com/search/issues?q=${query}`);

        if (!response.ok) {
            console.error('Failed to fetch participants', response.statusText);
            return [];
        }

        const data = await response.json();

        // Map issues to participants
        // We assume one issue per participant per challenge
        const participants: Participant[] = data.items.map((issue: any) => ({
            username: issue.user.login,
            avatarUrl: issue.user.avatar_url,
            url: issue.html_url,
            body: issue.body || '',
            issueNumber: issue.number,
            title: issue.title,
            // We could try to extract stack from body if structured, but for now let's keep it simple
            // or maybe random/placeholder if not found, but better to just show username
        }));

        // Store in cache
        setInCache(`participants_${tag}`, participants);
        console.log(`[Cache] Stored participants for ${tag}`);

        return participants;
    } catch (error) {
        console.error('Error fetching participants:', error);
        return [];
    }
}

// ============================================
// DISCUSSIONS API (GraphQL)
// ============================================

export interface Discussion {
    id: string;
    title: string;
    url: string;
    createdAt: string;
    author: {
        login: string;
        avatarUrl: string;
    };
    category: {
        name: string;
        emoji: string;
    };
    comments: {
        totalCount: number;
    };
    upvoteCount: number;
}

export async function getDiscussions(limit: number = 5, token?: string): Promise<Discussion[]> {
    // Check cache first
    const cached = getFromCache<Discussion[]>(`discussions_${limit}`);
    if (cached) {
        console.log(`[Cache] Using cached discussions`);
        return cached;
    }

    // If no token provided, return empty (fallback UI will be shown)
    if (!token) {
        console.log('[Discussions] No GitHub token provided, using fallback UI');
        return [];
    }

    try {
        // GraphQL query for discussions
        const query = `
            query {
                repository(owner: "${REPO_OWNER}", name: "${REPO_NAME}") {
                    discussions(first: ${limit}, orderBy: {field: CREATED_AT, direction: DESC}) {
                        nodes {
                            id
                            title
                            url
                            createdAt
                            author {
                                login
                                avatarUrl
                            }
                            category {
                                name
                                emoji
                            }
                            comments {
                                totalCount
                            }
                            upvoteCount
                        }
                    }
                }
            }
        `;

        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            console.warn('GraphQL request failed:', response.status);
            return [];
        }

        const result = await response.json();
        
        if (result.errors) {
            console.warn('GraphQL errors:', result.errors);
            return [];
        }

        const discussions: Discussion[] = result.data?.repository?.discussions?.nodes || [];

        // Store in cache
        setInCache(`discussions_${limit}`, discussions);
        console.log(`[Cache] Stored discussions`);

        return discussions;
    } catch (error) {
        console.error('Error fetching discussions:', error);
        return [];
    }
}

export async function getIssueComments(issueNumber: number): Promise<IssueComment[]> {
    // Check cache first
    const cached = getFromCache<IssueComment[]>(`comments_${issueNumber}`);
    if (cached) {
        console.log(`[Cache] Using cached comments for issue #${issueNumber}`);
        return cached;
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`
        );

        if (!response.ok) {
            console.error('Failed to fetch comments', response.statusText);
            return [];
        }

        const data = await response.json();

        const comments: IssueComment[] = data.map((comment: any) => ({
            id: comment.id,
            username: comment.user.login,
            avatarUrl: comment.user.avatar_url,
            body: comment.body || '',
            createdAt: comment.created_at,
        }));

        // Store in cache
        setInCache(`comments_${issueNumber}`, comments);
        console.log(`[Cache] Stored comments for issue #${issueNumber}`);

        return comments;
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
}
