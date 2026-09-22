const subscriptionPlans = {
  free: {
    name: "Free",

    price: {
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    },

    validity: {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    },

    dailyDownloadLimit: 1,
    monthlyDownloadLimit: 1,

    maxStreamingQuality: "480p",
    maxWatchMinutesPerDay: 60,

    unlimitedVideoAccess: false,
    offlineDownloads: true,
    priorityContent: false,
    fasterStreaming: false,
    exclusiveCourses: false,
    adFree: false,

    premiumVideoAccess: false,

    features: [
      "Limited access to premium videos",
      "480p streaming quality",
      "60 minutes daily watch time",
      "1 download per day",
      "Standard content access",
    ],
  },

  bronze: {
    name: "Bronze",

    price: {
      monthly: 99,
      quarterly: 249,
      yearly: 899,
    },

    validity: {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    },

    dailyDownloadLimit: 5,
    monthlyDownloadLimit: 100,

    maxStreamingQuality: "720p",
    maxWatchMinutesPerDay: 180,

    unlimitedVideoAccess: true,
    offlineDownloads: true,
    priorityContent: true,
    fasterStreaming: true,
    exclusiveCourses: false,
    adFree: false,

    premiumVideoAccess: true,

    features: [
      "Unlimited video access",
      "720p streaming quality",
      "180 minutes daily watch time",
      "5 downloads per day",
      "Priority content access",
      "Faster streaming",
    ],
  },

  silver: {
    name: "Silver",

    price: {
      monthly: 199,
      quarterly: 499,
      yearly: 1799,
    },

    validity: {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    },

    dailyDownloadLimit: 10,
    monthlyDownloadLimit: 200,

    maxStreamingQuality: "1080p",
    maxWatchMinutesPerDay: 300,

    unlimitedVideoAccess: true,
    offlineDownloads: true,
    priorityContent: true,
    fasterStreaming: true,
    exclusiveCourses: true,
    adFree: true,

    premiumVideoAccess: true,

    features: [
      "Unlimited video access",
      "1080p streaming quality",
      "300 minutes daily watch time",
      "10 downloads per day",
      "Priority content access",
      "Faster streaming",
      "Exclusive premium courses",
      "Ad-free viewing",
    ],
  },

  gold: {
    name: "Gold",

    price: {
      monthly: 299,
      quarterly: 749,
      yearly: 2499,
    },

    validity: {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    },

    dailyDownloadLimit: 20,
    monthlyDownloadLimit: 500,

    maxStreamingQuality: "4K",
    maxWatchMinutesPerDay: 600,

    unlimitedVideoAccess: true,
    offlineDownloads: true,
    priorityContent: true,
    fasterStreaming: true,
    exclusiveCourses: true,
    adFree: true,

    premiumVideoAccess: true,

    features: [
      "Unlimited video access",
      "4K streaming quality",
      "600 minutes daily watch time",
      "20 downloads per day",
      "Priority content access",
      "Faster streaming",
      "Exclusive premium courses",
      "Ad-free viewing",
      "Highest platform access level",
    ],
  },
};

export default subscriptionPlans;