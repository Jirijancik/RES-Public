import { InstagramIcon, TwitterXIcon, YoutubeIcon, GitHubIcon } from "@/components/ui/icon-brand";

export type ExternalLink = {
  name: string;
  href: string;
};

export type SocialMediaLink = ExternalLink & {
  icon: React.ComponentType<{ className?: string }>;
};

export const socialMediaLinks = {
  instagram: {
    name: "Instagram",
    href: "https://www.instagram.com/user-name/",
    icon: InstagramIcon,
  },
  twitter: {
    name: "Twitter",
    href: "https://x.com/user-name",
    icon: TwitterXIcon,
  },
  youtube: {
    name: "YouTube",
    href: "https://www.youtube.com/@user-name",
    icon: YoutubeIcon,
  },
  github: {
    name: "GitHub",
    href: "https://github.com/user-name",
    icon: GitHubIcon,
  },
} as const satisfies Record<string, SocialMediaLink>;

export const socialMediaLinksArray: SocialMediaLink[] = Object.values(socialMediaLinks);
