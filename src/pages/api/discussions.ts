import type { APIRoute } from 'astro';

const REPO_OWNER = 'yoanbernabeu';
const REPO_NAME = 'DevChallenges';

export const prerender = false; // This route must be server-rendered

export const GET: APIRoute = async ({ url }) => {
    const limit = parseInt(url.searchParams.get('limit') || '6');
    
    // Get token from server-side environment variable (NOT exposed to client)
    const token = import.meta.env.GITHUB_TOKEN;
    
    if (!token) {
        // Return empty array if no token configured
        return new Response(JSON.stringify({ discussions: [], error: 'No token configured' }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60', // Cache for 1 minute
            },
        });
    }

    try {
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
                'User-Agent': 'DevChallenges-App',
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            console.error('GitHub API error:', response.status, response.statusText);
            return new Response(JSON.stringify({ discussions: [], error: 'GitHub API error' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await response.json();

        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            return new Response(JSON.stringify({ discussions: [], error: 'GraphQL error' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const discussions = result.data?.repository?.discussions?.nodes || [];

        return new Response(JSON.stringify({ discussions }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60', // Cache for 1 minute
            },
        });
    } catch (error) {
        console.error('Error fetching discussions:', error);
        return new Response(JSON.stringify({ discussions: [], error: 'Server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
