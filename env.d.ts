declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "production" | "test";
    DATABASE_URL?: string;
    GOOGLE_CALENDAR_ID?: string;
    GOOGLE_PROJECT_ID?: string;
    GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
    NEXT_PUBLIC_APP_NAME?: string;
    NEXT_PUBLIC_CALENDAR_IFRAME_URL?: string;
  }
}

