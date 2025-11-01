import { SciraLogo } from "./logos/scira-logo";

export const SciraLogoHeader = () => (
  <div className="my-1.5 flex items-center gap-2">
    <SciraLogo className="size-7" />
    <h2 className="font-sans font-normal text-foreground text-xl dark:text-foreground">
      Scira
    </h2>
  </div>
);
