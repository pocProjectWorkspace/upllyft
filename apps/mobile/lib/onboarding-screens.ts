export interface OnboardingScreenConfig {
  title: string;
  subtitle?: string;
  points: string[];
  iconName: string; // Ionicons name
}

export const parentScreens: OnboardingScreenConfig[] = [
  {
    title: 'Welcome to Upllyft',
    subtitle: "Your partner in your child's developmental journey",
    points: [],
    iconName: 'heart',
  },
  {
    title: "Create Your Child's Profile",
    points: [
      'Add child details',
      'Track developmental history',
      'Manage multiple children',
    ],
    iconName: 'person-circle',
  },
  {
    title: 'Track Milestones',
    points: [
      'Complete UFMF screening',
      'Get detailed reports',
      'Monitor progress over time',
    ],
    iconName: 'bar-chart',
  },
  {
    title: 'Connect with Other Parents',
    points: [
      'Share experiences',
      'Ask questions',
      'Access support groups',
    ],
    iconName: 'people',
  },
  {
    title: 'Find the Right Therapist',
    points: [
      'Browse qualified therapists',
      'Book video sessions',
      'Read reviews',
    ],
    iconName: 'calendar',
  },
  {
    title: 'Get Clinical Insights',
    points: [
      'AI-powered analysis',
      'Evidence-based recommendations',
      'Expert resources',
    ],
    iconName: 'bulb',
  },
  {
    title: 'Access Expert Resources',
    points: [
      'Curated articles',
      'Tools and guides from professionals',
    ],
    iconName: 'book',
  },
];

export const therapistScreens: OnboardingScreenConfig[] = [
  {
    title: 'Welcome to Upllyft for Professionals',
    subtitle: 'Tools to grow your practice and support families',
    points: [],
    iconName: 'medkit',
  },
  {
    title: 'Complete Your Professional Profile',
    points: [
      'Add credentials & certifications',
      'Set your specializations',
      'Upload verification documents',
    ],
    iconName: 'person-add',
  },
  {
    title: 'Manage Your Sessions',
    points: [
      'Set your availability',
      'Accept/decline bookings',
      'Automated reminders & Google Meet links',
    ],
    iconName: 'calendar',
  },
  {
    title: 'Access Screening Results',
    points: [
      'View UFMF reports',
      'Track client progress',
      'Get clinical insights',
    ],
    iconName: 'document-text',
  },
  {
    title: 'Manage Cases Efficiently',
    points: [
      'Create case files & IEPs',
      'AI-powered session notes',
      'Track goals & milestones',
    ],
    iconName: 'folder-open',
  },
  {
    title: 'Share Your Expertise',
    points: [
      'Post resources & articles',
      'Answer parent questions',
      'Build your reputation',
    ],
    iconName: 'chatbubbles',
  },
  {
    title: 'Build Your Community',
    points: [
      'Create specialized groups',
      'Moderate discussions',
      'Grow your network',
    ],
    iconName: 'people',
  },
  {
    title: 'Host Workshops & Events',
    points: [
      'Create webinars & Q&A sessions',
      'Reach more families',
      'Establish thought leadership',
    ],
    iconName: 'easel',
  },
];
