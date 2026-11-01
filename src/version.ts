// App version, format vYY.MM.XX[-dev]: year, month, release index within the month.
// "-dev" = changes not yet confirmed stable by the user (see CLAUDE.md).
export const APP_VERSION = "v26.11.01-dev";
// Build channel, set by the deploy workflow: "dev" for the development page (/fitpacer/dev/).
export const IS_DEV_BUILD = import.meta.env.VITE_CHANNEL === "dev";
