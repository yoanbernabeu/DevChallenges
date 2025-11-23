export interface Participant {
    username: string;
    avatarUrl: string;
    url: string;
    stack?: string; // Optional, might be parsed from body
}

export async function getParticipants(tag: string): Promise<Participant[]> {
    const repoOwner = 'yoanbernabeu';
    const repoName = 'DevChallenges';

    try {
        // Search for issues with the specific tag in the title or body
        // GitHub Search API is powerful for this.
        // Query: repo:yoanbernabeu/DevChallenges is:issue label:WEEK-XX (if we used labels)
        // Or just search text if tags are in title/body as requested: "${tag}" in:title,body

        // The user requirement says: "checker sur les issues github avec le tag de la semaine"
        // and "Tag Requis" in modal is #WEEK-042.

        const query = encodeURIComponent(`repo:${repoOwner}/${repoName} is:issue "${tag}"`);
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
            // We could try to extract stack from body if structured, but for now let's keep it simple
            // or maybe random/placeholder if not found, but better to just show username
        }));

        return participants;
    } catch (error) {
        console.error('Error fetching participants:', error);
        return [];
    }
}
