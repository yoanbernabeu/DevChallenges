import type { APIRoute } from 'astro';

const REPO_OWNER = 'yoanbernabeu';
const REPO_NAME = 'DevChallenges';

export const prerender = false; // This route must be server-rendered

export const GET: APIRoute = async ({ params }) => {
    const discussionId = params.id;
    
    if (!discussionId) {
        return new Response(JSON.stringify({ error: 'Discussion ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Get token from server-side environment variable (NOT exposed to client)
    const token = import.meta.env.GITHUB_TOKEN;
    
    if (!token) {
        return new Response(JSON.stringify({ discussion: null, error: 'No token configured' }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60', // Cache for 1 minute
            },
        });
    }

    try {
        // Fetch discussion details with comments using GraphQL
        const query = `
            query {
                node(id: "${discussionId}") {
                    ... on Discussion {
                        id
                        title
                        url
                        createdAt
                        body
                        bodyHTML
                        author {
                            login
                            avatarUrl
                        }
                        category {
                            name
                            emoji
                        }
                        upvoteCount
                        comments(first: 20) {
                            totalCount
                            nodes {
                                id
                                body
                                bodyHTML
                                createdAt
                                author {
                                    login
                                    avatarUrl
                                }
                                upvoteCount
                            }
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
                'User-Agent': 'DevChallenges-App',
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            console.error('GitHub API error:', response.status, response.statusText);
            return new Response(JSON.stringify({ discussion: null, error: 'GitHub API error' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await response.json();

        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            return new Response(JSON.stringify({ discussion: null, error: 'GraphQL error' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const discussion = result.data?.node || null;

        return new Response(JSON.stringify({ discussion }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60', // Cache for 1 minute
            },
        });
    } catch (error) {
        console.error('Error fetching discussion:', error);
        return new Response(JSON.stringify({ discussion: null, error: 'Server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
