export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  author: string;
  image: string;
  content: string;
}

export const posts: BlogPost[] = [
  {
    slug: "introducing-launchpad-ai",
    title: "Introducing Launchpad AI: Design to Flutter Code with AI",
    excerpt: "Describe your app idea, get beautiful designs and production-ready Flutter code in seconds.",
    date: "Mar 15, 2026",
    category: "Announcement",
    readTime: "4 min",
    author: "Adarsh Kumar",
    image: "https://lh3.googleusercontent.com/CwGQkERZQIadMhpEphW3k58HmhCs02NQRYpR9L_GIhU7qHIDfQlJp-ykadYDGA-x6_Bkq_Ea2r-fFr3rv4kW8Xw9A1DgJuD9hlE5Fw",
    content: `We're excited to announce Launchpad AI — a platform that turns your app ideas into beautiful designs and production-ready Flutter code in seconds.

## The Problem

Building mobile apps has always been a two-step process: first design, then code. Designers create mockups in Figma, then hand them off to developers who rebuild everything from scratch in Flutter or React Native. This disconnect leads to wasted time, mismatched implementations, and endless back-and-forth.

## Our Solution

Launchpad AI bridges this gap entirely. Describe your app in plain English, and our AI generates both the visual design and the clean Dart/Flutter code simultaneously. No handoff needed.

### How It Works

1. **Describe your app** — Type what you want in natural language
2. **AI generates designs** — Complete mobile screens with proper layout, spacing, and typography
3. **Export Flutter code** — Clean StatelessWidget and StatefulWidget code, ready to run
4. **Ship everywhere** — One codebase deploys to iOS, Android, web, and desktop

## What Makes Us Different

- **Flutter-first** — We generate real Flutter widgets, not just images
- **Production-ready** — Proper widget composition, theming, and responsive layouts
- **Material & Cupertino** — Support for both design languages
- **Multi-screen flows** — Complete app flows with navigation

## Getting Started

Launchpad AI is now in public beta. Sign up for free and start building your next app today.`,
  },
  {
    slug: "design-systems-mobile",
    title: "Building Design Systems for Flutter Apps",
    excerpt: "Create consistent, scalable design systems with tokens, components, and patterns for Flutter.",
    date: "Mar 10, 2026",
    category: "Tutorial",
    readTime: "7 min",
    author: "Adarsh Kumar",
    image: "https://lh3.googleusercontent.com/-MMEDlQhYVE8CLSReq5dD_9s_mXvDaJUB8HaM-gKSh4LUsgjpQOK3ov7qdaH7hsVFDF0rc3L6Hi1ppWlaWx-rYMhK8IAViAM-Gk",
    content: `A well-crafted design system is the foundation of any scalable mobile application. In this guide, we'll walk through building a design system for Flutter apps using Launchpad AI.

## Why Design Systems Matter

Design systems ensure consistency across your app. They define reusable components, color tokens, typography scales, and spacing rules that every screen follows.

## Design Tokens

Design tokens are the smallest pieces of your design system — colors, fonts, spacing values, and border radii.

### Color Tokens

Define your color palette as a set of semantic tokens:

- **Primary** — Your brand's main color
- **Secondary** — Supporting accent color
- **Surface** — Background colors for cards and containers
- **Error** — Validation and error states

### Typography Scale

Establish a clear hierarchy with consistent font sizes and weights. Flutter's Material theme makes this straightforward with \`TextTheme\`.

## Component Library

Build your components on top of your tokens. Start with the basics:

- **Buttons** — Primary, secondary, text, icon
- **Input fields** — Text, search, dropdown
- **Cards** — Content containers with consistent padding
- **Navigation** — Bottom nav, app bar, drawer

## Using Launchpad AI

When you generate screens with Launchpad AI, you can specify your design system. The AI will use your tokens and patterns to generate consistent code across all screens.`,
  },
  {
    slug: "ai-design-workflow",
    title: "How AI is Changing the Mobile Design Workflow",
    excerpt: "From wireframes to high-fidelity mockups, AI tools are transforming how designers work.",
    date: "Mar 5, 2026",
    category: "Insights",
    readTime: "5 min",
    author: "Adarsh Kumar",
    image: "https://lh3.googleusercontent.com/D6d1SQF0r3pePXE2e02y5nuvncVNFlQTMLmJm8ycWnjxC0Re9wQdvjQWHgcYYpduzGd7_QrfUTjC-OBUjDHOf_vWQ7fkMSRyEwhJ",
    content: `The mobile design workflow is undergoing a fundamental shift. AI tools are no longer just assistants — they're becoming co-creators.

## The Traditional Workflow

1. Research & wireframing (days)
2. High-fidelity mockups in Figma (days)
3. Developer handoff & implementation (weeks)
4. QA & iteration (days)

## The AI-Powered Workflow

1. Describe what you want (minutes)
2. AI generates designs + code (seconds)
3. Review and iterate (minutes)
4. Ship (same day)

## What This Means for Designers

AI doesn't replace designers — it amplifies them. Instead of spending hours on pixel-perfect layouts, designers can focus on:

- **Strategy** — What should we build and why?
- **User research** — Understanding real user needs
- **Creative direction** — Defining the visual language
- **Quality assurance** — Ensuring the AI output meets standards

## The Future

We believe the future of mobile design is collaborative — humans providing creative direction, AI handling the production work. Launchpad AI is built for this future.`,
  },
  {
    slug: "flutter-export-guide",
    title: "From Design to Flutter: Exporting Production-Ready Code",
    excerpt: "Step-by-step guide on exporting clean Dart & Flutter widget code from Launchpad AI.",
    date: "Feb 28, 2026",
    category: "Tutorial",
    readTime: "6 min",
    author: "Adarsh Kumar",
    image: "https://lh3.googleusercontent.com/7zm0iGoJpEdqqpo4GoqcLdOn0k-s9ZEMVy4MYn6Ia_3_FLlOzKHpb2iLlq7mVaLN7E4_5raueLuya7-MuvUyWFILPxBSdhTTz1XN",
    content: `One of the most powerful features of Launchpad AI is the ability to export production-ready Flutter code. Here's how to make the most of it.

## Understanding the Export

When you export from Launchpad AI, you get:

- **Clean Dart code** — Properly formatted, following Dart conventions
- **Widget composition** — Logical widget tree structure
- **Responsive layouts** — MediaQuery-aware sizing
- **Theme integration** — Uses ThemeData for colors and typography

## Step-by-Step Guide

### 1. Design Your Screens

Use the canvas to design your app screens. The AI will generate the visual design based on your description.

### 2. Review the Code

Click the code export button to see the generated Dart code. Review the widget structure and make sure it matches your expectations.

### 3. Copy to Your Project

Copy the generated code into your Flutter project. The code is self-contained — just paste it into a new file.

### 4. Customize

The generated code is a starting point. Customize colors, add business logic, connect to your backend.

## Best Practices

- **Start with a clear description** — The better your prompt, the better the output
- **Use design systems** — Specify your brand colors and typography
- **Iterate** — Generate, review, refine, repeat
- **Combine screens** — Export multiple screens and connect them with navigation`,
  },
  {
    slug: "mobile-ux-patterns",
    title: "10 Mobile UX Patterns Every Designer Should Know",
    excerpt: "Essential mobile UX patterns — from navigation to gestures — that make apps feel intuitive.",
    date: "Feb 20, 2026",
    category: "Design",
    readTime: "8 min",
    author: "Adarsh Kumar",
    image: "https://lh3.googleusercontent.com/CwGQkERZQIadMhpEphW3k58HmhCs02NQRYpR9L_GIhU7qHIDfQlJp-ykadYDGA-x6_Bkq_Ea2r-fFr3rv4kW8Xw9A1DgJuD9hlE5Fw",
    content: `Great mobile apps feel intuitive because they follow established UX patterns. Here are 10 patterns every designer should know.

## 1. Bottom Navigation

The most common navigation pattern for mobile apps. Keep it to 3-5 items, use clear icons with labels.

## 2. Pull to Refresh

Users expect to pull down on content lists to refresh. Implement this on any scrollable content feed.

## 3. Skeleton Screens

Show placeholder content shapes while loading instead of spinners. This reduces perceived load time.

## 4. Swipe Actions

Let users swipe list items to reveal actions like delete, archive, or share. Keep it discoverable.

## 5. Floating Action Button

A prominent circular button for the primary action on a screen. Use sparingly — one per screen max.

## 6. Search with Filters

Combine a search bar with filter chips. Let users narrow results without navigating to a separate screen.

## 7. Onboarding Carousel

Introduce key features with a swipeable carousel on first launch. Keep it to 3-4 screens.

## 8. Bottom Sheet

Present additional content or actions in a bottom sheet instead of a full-screen modal. Users can dismiss by swiping down.

## 9. Empty States

Design meaningful empty states with illustrations and clear calls to action. Never show a blank screen.

## 10. Gesture Navigation

Support standard gestures — swipe back, pinch to zoom, long press for context menus. Follow platform conventions.`,
  },
  {
    slug: "flutter-code-tips",
    title: "Flutter Code Generation: Best Practices and Tips",
    excerpt: "Tips for getting the most out of Launchpad AI's Flutter code export.",
    date: "Feb 12, 2026",
    category: "Engineering",
    readTime: "6 min",
    author: "Adarsh Kumar",
    image: "https://lh3.googleusercontent.com/kpKlgqVM9HpnzkABysl_zNiUI-dgwj1kzHnRnh1qkwyxedx6b7dqHkTnNa8cvACvifn2lIHWb95KStpEgveKsl621OibIwFtkky-Ng=w1200",
    content: `Getting the most out of AI-generated Flutter code requires understanding how to prompt effectively and how to integrate the output into your project.

## Writing Effective Prompts

The quality of generated code depends heavily on your prompt. Here are some tips:

### Be Specific

Instead of "make a login screen", try "a login screen with email and password fields, a Google sign-in button, forgot password link, and dark theme with rounded corners".

### Mention Components

Reference specific Flutter components: "use a BottomNavigationBar with 4 tabs", "include a SliverAppBar with a hero image".

### Specify Layout

Describe the layout structure: "a Column with a header image, title, description, and a row of action buttons at the bottom".

## Code Quality Tips

### Widget Extraction

The AI generates complete widget trees. Extract reusable widgets into separate classes for better maintainability.

### State Management

Generated code uses StatelessWidget where possible and StatefulWidget where state is needed. For complex apps, consider integrating with Provider, Riverpod, or BLoC.

### Theme Integration

Generated code uses ThemeData. Customize the theme to match your brand — the generated widgets will automatically pick up the changes.

## Common Patterns

- **List screens** — Use ListView.builder for dynamic content
- **Detail screens** — CustomScrollView with SliverAppBar
- **Form screens** — Form widget with TextFormField validation
- **Dashboard screens** — GridView with card-based layout`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
