import {
  LayoutIcon,
  SettingsIcon,
  SearchIcon,
  CookieIcon,
  ShieldIcon,
  MessageSquareIcon,
  PaletteIcon,
  SparklesIcon,
  CheckIcon,
} from "lucide-react";
import { Button } from "../ui/button";

type Feature = {
  title: string;
  description: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  items?: string[];
};

const features: Feature[] = [
  {
    title: "Responsive Layout System",
    description:
      "Advanced header with mobile-friendly drawer navigation using Vaul. Supports nested menu items with unified data source that powers both header and footer navigation.",
    icon: LayoutIcon,
    items: ["Mobile-first drawer navigation", "Nested menu support", "Unified navigation data"],
  },
  {
    title: "Unified Configuration",
    description:
      "Centralized config folder serving as single source of truth for site metadata, navigation links, contact information, legal content, and business details. Eliminates hardcoded values across components.",
    icon: SettingsIcon,
    items: ["Single source of truth", "Easy maintenance", "No hardcoded values"],
  },
  {
    title: "SEO-Optimized Foundation",
    description:
      "Comprehensive SEO setup with auto-generated OG images, sitemap, and robots.txt. Perfect default for most projects for optimal search engine visibility that requires almost zero maintenance.",
    icon: SearchIcon,
    items: ["Auto-generated OG images", "Dynamic sitemap", "Optimized robots.txt"],
  },
  {
    title: "GDPR Compliance System",
    description:
      "Customizable EU-compliant consent system with granular controls. Supports analytics, marketing, and functional tracking with user preferences and easy consent management.",
    icon: CookieIcon,
    items: ["EU-compliant consent", "Granular tracking controls", "User preference storage"],
  },
  {
    title: "Privacy Policy Ready",
    description:
      "Pre-built GDPR-compliant privacy policy page with configurable legal information. Includes data processing details, user rights, and cookie usage transparency.",
    icon: ShieldIcon,
    items: ["GDPR-compliant template", "Configurable legal info", "User rights documentation"],
  },
  {
    title: "Contact Form with Protection",
    description:
      "Production-ready contact form with Cloudflare Turnstile captcha integration. Features form validation, error handling, and API route submission with proper feedback mechanisms.",
    icon: MessageSquareIcon,
    items: ["Turnstile captcha", "Form validation", "API route integration"],
  },
  {
    title: "Advanced Theme Management",
    description:
      "Sophisticated theme switcher supporting light, dark, and system preferences. Uses next-themes for seamless transitions with persistent user preferences and proper SSR handling.",
    icon: PaletteIcon,
    items: ["Light/dark/system modes", "Persistent preferences", "SSR-compatible"],
  },
  {
    title: "Hero Component System",
    description:
      "Flexible hero section components with background patterns, content management, and responsive layouts. Includes grid backgrounds, action buttons, and customizable content structures.",
    icon: SparklesIcon,
    items: ["Background patterns", "Action buttons", "Responsive layouts"],
  },
];

export function FeaturesBlock(props: React.ComponentProps<"div">) {
  return (
    <div {...props}>
      <h2 className="text-2xl font-semibold sm:text-3xl">Built-in Features</h2>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {features.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="bg-muted rounded-xl p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <Button size="icon-lg" variant={"outline"}>
                  <div>
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                </Button>
                <h3 className="text-foreground text-base font-medium">{item.title}</h3>
              </div>

              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {item.description}
              </p>

              {item.items && (
                <ul className="space-y-3">
                  {item.items.map((subItem, itemIndex) => (
                    <li key={itemIndex} className="flex items-center gap-3">
                      <div className="bg-muted-foreground/20 flex size-4 items-center justify-center rounded-full">
                        <CheckIcon className="text-muted-foreground size-2.5" aria-hidden="true" />
                      </div>
                      <span className="text-foreground text-sm">{subItem}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
