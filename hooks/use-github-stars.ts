import { useQuery } from "@tanstack/react-query";

const GITHUB_STARS_FALLBACK = 9000 as const;
const FIVE_MINUTES_MS = 300_000 as const;
const TEN_MINUTES_MS = 600_000 as const;

type GitHubRepo = {
  stargazers_count: number;
  name: string;
  full_name: string;
};

export function useGitHubStars() {
  return useQuery({
    queryKey: ["github-stars"],
    queryFn: async (): Promise<number> => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/zaidmukaddam/scira"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch GitHub stars");
        }
        const data: GitHubRepo = await response.json();
        return data.stargazers_count;
      } catch (_error) {
        return GITHUB_STARS_FALLBACK;
      }
    },
    staleTime: FIVE_MINUTES_MS, // 5 minutes
    gcTime: TEN_MINUTES_MS, // 10 minutes
    refetchOnWindowFocus: false,
  });
}
